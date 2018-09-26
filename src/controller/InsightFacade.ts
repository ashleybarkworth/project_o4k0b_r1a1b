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

        // // TODO inserting test data here
        // this.loadedDataSets = [{
        //     id: "courses", sections: [
        //         {
        //             id: "101",
        //             dept: "span",
        //             avg: 98,
        //             instructor: "",
        //             title: "Intro to Spanish",
        //             pass: 400,
        //             fail: 50,
        //             audit: 5,
        //             uuid: "testb",
        //             year: 2014
        //         },
        //         {
        //             id: "310",
        //             dept: "cpsc",
        //             avg: 50,
        //             instructor: "Reid Holmes",
        //             title: "Software Something",
        //             pass: 200,
        //             fail: 20,
        //             audit: 2,
        //             uuid: "testa",
        //             year: 2017
        //         },
        //         {
        //             id: "420b",
        //             dept: "poli",
        //             avg: 30,
        //             instructor: "Cool person",
        //             title: "",
        //             pass: 30,
        //             fail: 1,
        //             audit: 0,
        //             uuid: "testc",
        //             year: 2014
        //         },
        //         {
        //             id: "301",
        //             dept: "cpsc",
        //             avg: 80,
        //             instructor: "John",
        //             title: "Title",
        //             pass: 100,
        //             fail: 5,
        //             audit: 0,
        //             uuid: "tesd",
        //             year: 2017
        //         }]
        // }];
    }

    // TODO ashley throw InsightErrors for various reasons addDataset can fail
    // TODO ashley this code is gross, create method for create course sections/clean it up
    // TODO ashley don't code at midnight
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise <string[]> {
        let promises: any[] = [];
        return new Promise<string[]>((resolve, reject) => {
            if (kind !== InsightDatasetKind.Courses && kind !== InsightDatasetKind.Rooms) {
                reject("Invalid InsightDataset kind");
            } else {
                // TODO ashley add load dataset from disk
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
                                reject(["Invalid JSON"]);
                            }
                            for (const c of parsedJSON.result) {
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
                            }
                        }
                        let dataset: IFullDataset = {id, sections: courseSections};
                        loadedDataSets.push(dataset);
                        resolve(loadedDataSets
                            .map((courseDataset: IFullDataset) => courseDataset.id));
                    }).catch( function () {
                        reject(["Error while adding dataset"]);
                    });
                }).catch(function () {
                    reject(["Error while adding dataset"]);
                });
            }
        });
    }

    public removeDataset(id: string): Promise < string > {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            if (!query.hasOwnProperty("WHERE") || !query.hasOwnProperty("OPTIONS")) {
                throw new InsightError("Missing OPTIONS or WHERE key");
            }

            let options: IOptions = new OptionsDeserializer().deserialize(query.OPTIONS);
            let datasetToQuery = this.getDataSetToQuery(options.key);
            if (options.order !== undefined) {
                datasetToQuery.sections.sort((secA, secB) => secA[options.order] < secB[options.order] ? -1 : 1);
            }
            let filter: IFilter = new FilterDeserializer(options.key).deserialize(query.WHERE);
            let result: any[] = [];
            for (let section of datasetToQuery.sections) {
                if (filter.validCourseSection(section)) {
                    let entry: any = {};
                    options.columns.forEach((key) => entry[options.key + "_" + key] = section[key]);
                    result.push(entry);
                }
            }
            resolve(result);
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
