import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import {ICourseSection, IFullDataset} from "../model/IFullDataset";
import * as JSZip from "jszip";
import * as fs from "fs";
import {IOptions} from "../model/Options";
import {IFilter} from "../model/Filter";
import {FilterDeserializer} from "../deserializers/FilterDeserializer";
import {OptionsDeserializer} from "../deserializers/OptionsDeserializer";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

const loadedDataSets: IFullDataset[] = [];
const path = "./data/";

export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");

        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise <string[]> {
        let promises: any[] = [];
        let self = this;
        return new Promise<string[]>((resolve, reject) => {
            // For now, room types are not allowed
            if (kind !== InsightDatasetKind.Courses) {
                let err = new InsightError("Invalid dataset kind");
                reject(err);
                throw err;
            } else if (!id || id.length === 0) {
                let err = new InsightError("Dataset id is null, undefined or empty");
                reject(err);
                throw err;
            } else {
                fs.readdir(path, function (err, files) {
                    if (err) {
                        err = new InsightError("Couldn't retrieve files in /data directory");
                        reject(err);
                        throw err;
                    } else {
                        let datasetExists: boolean = Boolean(files.map((file) =>
                            file.split(".").slice(0, -1).join("."))
                            .find((fileName) => fileName === id)
                            || !loadedDataSets.every((dataset) => dataset.id !== id));
                        if (datasetExists) { reject(new InsightError("Dataset with this id already exists")); }
                    }
                });
                const jsZip = new JSZip();
                jsZip.loadAsync(content, {base64: true}).then(function (zip) {
                    const courseDirectory: string = "courses/.*";
                    let files = Object.keys(zip.files).filter((directory) => directory.match(courseDirectory));
                    if (files.length === 0) {
                        let err = new InsightError("No files found in courses folder");
                        reject(err);
                        throw err;
                    }
                    files.forEach(function (fileName) {
                        let promise: any = zip.files[fileName].async("text");
                        promises.push(promise);
                    });
                    Promise.all(promises).then((fileData) => {
                        try {
                            let dataset: IFullDataset = self.addCourseSectionsToDataSet(id, fileData);

                            let datasetContent: string = JSON.stringify(dataset);

                            fs.writeFile(path + id + ".json" , datasetContent, function (err) {
                                if (err) {
                                    throw new InsightError("Error persisting dataset to disk");
                                }
                            });
                            resolve(loadedDataSets.map((courseDataset: IFullDataset) => courseDataset.id));
                        } catch (err) {
                            reject(err);
                            throw err;
                        }
                    }).catch( function (err) {
                        reject(new InsightError(err));
                        throw err;
                    });
                }).catch(function (err) {
                    reject(new InsightError(err));
                    throw err;
                });
            }
        });
    }

    public removeDataset(id: string): Promise <string> {
        return new Promise<string>(function (resolve, reject) {
            if (id == null) {
                let err = new InsightError("Null or undefined id");
                reject(err);
                throw err;
            }

            let datasetIndex: number = loadedDataSets.findIndex((dataset) => dataset.id === id);

            if (datasetIndex === -1) {
                let err = new NotFoundError("No dataset with that id added yet");
                reject(err);
                throw err;
            } else {
                loadedDataSets.splice(datasetIndex, 1);
            }

            fs.readdir(path, function (err, files) {
                if (err) {
                    reject(new InsightError(err));
                    throw err;
                }

                if (!files.includes(id + ".json")) {
                    err = new NotFoundError("No dataset with that id added yet");
                    reject(err);
                    return;
                } else {
                    fs.unlink(path + id + ".json", (error) => {
                        if (error) {
                            err = new InsightError("Error removing dataset from disk");
                            reject(err);
                            throw err;
                        }
                        resolve(id);
                    });
                }
            });
        });
    }

    public performQuery(query: any): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
                try {
                    if (query == null || !query.hasOwnProperty("WHERE") || !query.hasOwnProperty("OPTIONS")) {
                        throw new InsightError("Invalid query");
                    }

                    // Transform raw body into an IOptions and IFilter object; grab the dataset as soon as we know which
                    // key we're looking for so that we can fail fast.
                    let options: IOptions = new OptionsDeserializer().deserialize(query.OPTIONS);
                    let datasetToQuery = this.getDataSetToQuery(options.key);
                    let filter: IFilter = new FilterDeserializer(options.key).deserialize(query.WHERE);

                    // Loop through the dataset and use the filter object to determine which sections should be included
                    let result: any[] = [];
                    let resultCount: number = 0;
                    for (let section of datasetToQuery.sections) {
                        if (filter.validCourseSection(section)) {
                            // This section should be included in the results. We determine which properties to include
                            // based on the OPTIONS.COLUMNS field, which gives the keys to include
                            let entry: any = {};
                            options.columns.forEach((key) => entry[options.key + "_" + key] = section[key]);
                            result.push(entry);
                            resultCount++;
                            if (resultCount > 5000) {
                                throw new InsightError("Too many results");
                            }
                        }
                    }
                    // Sort our results if necessary
                    if (options.order !== undefined) {
                        result.sort((secA, secB) => secA[options.order] <= secB[options.order] ? -1 : 1);
                    }
                    resolve(result);
                } catch (err) {
                    reject(new InsightError(err));
                    throw err;
                }
            }
        );
    }

    /**
     * Parses file content from the zip into valid course sections, then creates and returns a
     * new dataset with these course sections and the given ID. Any invalid course sections or invalid course files
     * (e.g., files containing invalid JSON) are ignored. A valid dataset must contain at least one valid
     * course section, or an InsightError is thrown.
     *
     * In order for a course section to be valid, it must:
     *  1. Contain all of the following keys: Course, Subject, Avg, Professor, Title, Pass, Fail, Audit, id, Year
     *  2. Key value types must match the type in the corresponding ICourseSection field (with the exception of
     *  Year and id)
     *
     * @param id        the id of the dataset we are adding, e.g. 'courses'
     * @param fileData  the file content
     * @return          the added dataset
     * @throws          InsightError if the dataset contains no valid course sections
     */
    private addCourseSectionsToDataSet(id: string, fileData: any): IFullDataset {
        let courseSections: ICourseSection[] = [];
        for (let i = 1; i < fileData.length; i++) {
            let parsedJSON: any;
            try {
                parsedJSON = JSON.parse(fileData[i]);
            } catch (err) {
                continue;
            }
            for (const c of parsedJSON.result) {
                try {
                    const courseId: string = typeof c.Course === "string" ? c.Course : undefined;
                    const dept: string = typeof c.Subject === "string" ? c.Subject : undefined;
                    const avg: number = typeof c.Avg === "number" ? c.Avg : undefined;
                    const instructor: string = typeof c.Professor === "string"
                        ? c.Professor : undefined;
                    const title: string = typeof c.Title === "string" ? c.Title : undefined;
                    const pass: number = typeof c.Pass === "number" ? c.Pass : undefined;
                    const fail: number = typeof c.Fail === "number" ? c.Fail : undefined;
                    const audit: number = typeof c.Audit === "number" ? c.Audit : undefined;
                    const uuid: string = typeof c.id === "number" ? String(c.id) : undefined;
                    const year: number = typeof c.Year === "string" ? Number(c.Year) : undefined;

                    const courseSection: ICourseSection = {
                        id: courseId,
                        dept,
                        avg,
                        instructor,
                        title,
                        pass,
                        fail,
                        audit,
                        uuid,
                        year
                    };

                    let noNullProperties: boolean = Object.values(courseSection)
                        .every((property) => property != null);

                    if (noNullProperties) {
                        courseSections.push(courseSection);
                    }
                } catch (err) { // continue to next course section if any errors occur
                    continue;
                }

            }
        }

        if (courseSections.length === 0) {
            throw new InsightError("Dataset contains no valid course sections");
        } else {
            let dataset: IFullDataset = {id, sections: courseSections};
            loadedDataSets.push(dataset);

            return dataset;
        }
    }

    private getDataSetToQuery(key: string) {
        let datasetToQuery: IFullDataset = loadedDataSets.find((ds) => ds.id === key);
        if (datasetToQuery === undefined) {
            throw new InsightError("Couldn't find a dataset with that id"); // TODO try to load from disk
        }
        return datasetToQuery;
    }

    public listDatasets(): Promise<InsightDataset[]> {
        // TODO load from disk
        return new Promise<InsightDataset[]>((resolve, reject) => {
            try {
                resolve(loadedDataSets.map((ds) => {
                    return {
                        id: ds.id,
                        kind: InsightDatasetKind.Courses, // TODO lol
                        numRows: ds.sections.length,
                    }  as
                        InsightDataset;
                }));
            } catch (err) {
                reject(err);
            }
        });
    }
}
