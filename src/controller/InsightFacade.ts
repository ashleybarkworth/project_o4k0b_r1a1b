import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import {ICourseSection, IFullDataset} from "../model/IFullDataset";
import * as JSZip from "jszip";
import * as fs from "fs";
import {IOptions} from "../model/Options";
import {IFilter} from "../model/Filter.js";
import {FilterDeserializer} from "../deserializers/FilterDeserializer";
import {OptionsDeserializer} from "../deserializers/OptionsDeserializer";

let loadedDataSets: IFullDataset[] = [];

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    // TODO ashley throw InsightErrors for various reasons addDataset can fail
    // TODO ashley this code is gross, create method for create course sections/clean it up
    // TODO ashley don't code at midnight
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise <string[]> {
        let promises: any[] = [];
        let path: string = "./src/data/";
        return new Promise<string[]>((resolve, reject) => {
            // For now, room types are not allowed
            if (kind !== InsightDatasetKind.Courses) {
                reject(new InsightError("Invalid dataset kind"));
            } else if (!id || id.length === 0) {
                reject(new InsightError("Dataset id is null, undefined or empty"));
            } else {
                fs.readdir(path, function (err, files) {
                    if (err) {
                        reject(new InsightError("Couldn't retrieve files in /data directory"));
                    } else {
                        let datasetExists: boolean = Boolean(files.map((file) =>
                            file.split(".").slice(0, -1).join("."))
                            .find((fileName) => fileName === id));
                        if (datasetExists) { reject(new InsightError("Dataset with this id already exists")); }
                    }
                });
                const jsZip = new JSZip();
                jsZip.loadAsync(content, {base64: true}).then(function (zip) {
                    if (Object.keys(zip.folder("courses").files).length === 0) {
                        reject("ZIP file is empty");
                    }
                    Object.keys(zip.folder("courses").files).forEach(function (fileName) {
                        let promise: any = zip.files[fileName].async("text");
                        promises.push(promise);
                    });
                    Promise.all(promises).then(function (fileData) {
                        let courseSections: ICourseSection[] = [];
                        for (let i = 1; i < fileData.length; i++) {
                            // TODO ashley check if course section is empty, invalid values (number/string mismatch)
                            let parsedJSON: any;
                            try {
                                parsedJSON = JSON.parse(fileData[i]);
                            } catch (err) {
                                continue; // TODO check if a file can contain invalid JSON?
                            }
                            for (const c of parsedJSON.result) {
                                try {
                                    const courseId: string = c.Course;
                                    const dept: string = c.Subject;
                                    const avg: number = c.Avg;
                                    const instructor: string = c.Professor;
                                    const title: string = c.Title;
                                    const pass: number = c.Pass;
                                    const fail: number = c.Fail;
                                    const audit: number = c.Audit;
                                    const uuid: string = String(c.id);
                                    const year: number = Number(c.Year);

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
                                    courseSections.push(courseSection);
                                } catch (err) {
                                    continue;
                                }

                            }
                        }

                        if (courseSections.length === 0) {
                            reject(new InsightError("Dataset contains no valid course sections"));
                        }

                        if (!fs.existsSync(path)) {
                            fs.mkdirSync(path);
                        }

                        fs.writeFile(path + id + ".json" , JSON.stringify(fileData), function (err) {
                            if (err) {
                                reject(new InsightError("Error persisting dataset to disk"));
                            }
                        });

                        let dataset: IFullDataset = {id, sections: courseSections};
                        loadedDataSets.push(dataset);

                        resolve(loadedDataSets.map((courseDataset: IFullDataset) => courseDataset.id));
                    }).catch( function () {
                        reject(new InsightError());
                    });
                }).catch(function (err: any) {
                    reject(new InsightError());
                });
            }
        });
    }

    public removeDataset(id: string): Promise < string > {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            if (query == null || query === undefined ||
                !query.hasOwnProperty("WHERE") || !query.hasOwnProperty("OPTIONS")) {
                let insightError = new InsightError("Invalid query");
                reject(insightError);
                throw insightError;
            }
            try {
                let options: IOptions = new OptionsDeserializer().deserialize(query.OPTIONS);
                let datasetToQuery = this.getDataSetToQuery(options.key);
                let filter: IFilter = new FilterDeserializer(options.key).deserialize(query.WHERE);
                let result: any[] = [];
                for (let section of datasetToQuery.sections) {
                    if (filter.validCourseSection(section)) {
                        let entry: any = {};
                        options.columns.forEach((key) => entry[options.key + "_" + key] = section[key]);
                        result.push(entry);
                    }
                }
                if (options.order !== undefined) {
                    result.sort((secA, secB) => secA[options.order] <= secB[options.order] ? -1 : 1);
                }
                resolve(result);
            } catch (err) {
                reject(new InsightError(err));
                throw err;
            }
        });
    }

    private getDataSetToQuery(key: string) {
        let datasetToQuery: IFullDataset = loadedDataSets.find((ds) => ds.id === key);
        if (datasetToQuery === undefined) {
            throw new InsightError("Couldn't find a dataset with that id"); // TODO try to load from disk
        }
        return datasetToQuery;
    }

    public listDatasets(): Promise < InsightDataset[] > {
        return Promise.reject("Not implemented.");
    }
}
