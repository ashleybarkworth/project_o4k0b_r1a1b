import {IQuery} from "../model/Query";
import {IDataSetEntry, IFullDataset} from "../model/IFullDataset";
import {InsightError} from "../controller/IInsightFacade";
import {IOptions} from "../model/Options";

export class QueryPerformerService {

    public performQuery(query: IQuery, dataset: IFullDataset): any[] {
        if (query.options.kind !== dataset.kind) {
            throw new InsightError("Mismatch between kind inferred from columns and actual kind");
        }
        // Loop through the dataset and use the filter object to determine which sections should be included
        let result: any[] = [];
        let resultCount: number = 0;
        for (let section of dataset.entries) {
            if (query.filter.validEntry(section)) {
                result.push(this.getResult(query.options, section));
                resultCount++;
                if (resultCount > 5000) {
                    throw new InsightError("Too many results");
                }
            }
        }
        this.sortResultsIfNecessary(query.options, result);
        return result;
    }

    private sortResultsIfNecessary(options: IOptions, result: any[]) {
        if (options.order !== undefined) {
            result.sort((secA, secB) => secA[options.order] <= secB[options.order] ? -1 : 1);
        }
    }

    private getResult(options: IOptions, section: IDataSetEntry): any {
        // This section should be included in the results. We determine which properties to include
        // based on the OPTIONS.COLUMNS field, which gives the keys to include
        let entry: any = {};
        options.columns.forEach((key) => entry[options.key + "_" + key] = section[key]);
        return entry;
    }
}
