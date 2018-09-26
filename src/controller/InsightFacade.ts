import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import {ICourseSection, IFullDataset} from "../model/IFullDataset";
import {IOptions} from "../model/Options";
import {IFilter} from "../model/Filter.js";
import {FilterDeserializer} from "../deserializers/FilterDeserializer";
import {OptionsDeserializer} from "../deserializers/OptionsDeserializer";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private loadedDataSets: IFullDataset[];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");

        // TODO inserting test data here
        this.loadedDataSets = [{
            id: "courses", sections: [
                {
                    id: "101",
                    dept: "span",
                    avg: 98,
                    instructor: "",
                    title: "Intro to Spanish",
                    pass: 400,
                    fail: 50,
                    audit: 5,
                    uuid: "testb",
                    year: 2014
                },
                {
                    id: "310",
                    dept: "cpsc",
                    avg: 50,
                    instructor: "Reid Holmes",
                    title: "Software Something",
                    pass: 200,
                    fail: 20,
                    audit: 2,
                    uuid: "testa",
                    year: 2017
                },
                {
                    id: "420b",
                    dept: "poli",
                    avg: 30,
                    instructor: "Cool person",
                    title: "",
                    pass: 30,
                    fail: 1,
                    audit: 0,
                    uuid: "testc",
                    year: 2014
                },
                {
                    id: "301",
                    dept: "cpsc",
                    avg: 80,
                    instructor: "John",
                    title: "Title",
                    pass: 100,
                    fail: 5,
                    audit: 0,
                    uuid: "tesd",
                    year: 2017
                }]
        }];
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return Promise.reject("Not implemented.");
    }

    public removeDataset(id: string): Promise<string> {
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
        let datasetToQuery: IFullDataset = this.loadedDataSets.find((ds) => ds.id === key);
        if (datasetToQuery === undefined) {
            throw new InsightError("Couldn't find a dataset with that id"); // TODO try to load from disk
        }
        return datasetToQuery;
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }
}
