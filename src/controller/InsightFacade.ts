import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import {IFullDataset} from "../model/IFullDataset";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private loadedDataSets: IFullDataset[];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return Promise.reject("Not implemented.");
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise <any[]> {
        if (!query.hasOwnProperty("WHERE")) {
            throw new InsightError("Missing WHERE key");
        }
        let filter = query.WHERE;
        let keys: string[] = Object.keys(filter);
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.reject("Not implemented.");
    }
}
