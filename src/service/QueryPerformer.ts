import {IQuery} from "../model/Query";
import {IDataSetEntry, IFullDataset} from "../model/IFullDataset";
import {InsightError} from "../controller/IInsightFacade";
import {IOptions, SortDirection} from "../model/Options";

export class QueryPerformer {

    public performQuery(query: IQuery, dataset: IFullDataset): any[] {
        if (query.options.kind !== dataset.kind) {
            throw new InsightError("Mismatch between kind inferred from columns and actual kind");
        }
        // Loop through the dataset and use the filter object to determine which sections should be included
        let matchingSections: IDataSetEntry[] = dataset.entries.filter((e) => query.filter.validEntry(e));
        let result: any[];
        let transformations = query.options.transformations;
        if (transformations == null) {
            result = matchingSections.map((section) => this.getResult(query.options, section));
        } else {
            let groups: any = QueryPerformer.groupBy(matchingSections, transformations.group);
            let intermediary: any[] = Object.values(groups).map((group) => {
                let intermediaryObj: any = {};
                transformations.group.forEach((g) => intermediaryObj[g] = group[0][g]);
                transformations.apply.forEach((a) => intermediaryObj[a.getName()] = a.apply(group));
                return intermediaryObj;
            });
            result = intermediary.map((i) => this.getResult(query.options, i));
        }
        if (result.length > 5000) {
            throw new InsightError("Too many results!");
        }
        this.sortResultsIfNecessary(query.options, result);
        return result;
    }

    private sortResultsIfNecessary(options: IOptions, result: any[]) {
        if (options.order !== undefined) {
            let sortFunc: (a: IDataSetEntry, b: IDataSetEntry) => boolean = (a: IDataSetEntry, b: IDataSetEntry) => {
                for (let key of options.order.keys) {
                    if (a[key] !== b[key]) {
                        return options.order.dir === SortDirection.UP ? a[key] < b[key] : b[key] < a[key];
                    }
                }
                return true; // if all are equal, break ties arbitrarily
            };
            result.sort((a, b) => sortFunc(a, b) ? -1 : 1);
        }
    }

    private getResult(options: IOptions, object: any): any {
        //  We determine which properties to include based on the OPTIONS.COLUMNS field, which gives the keys to include
        let entry: any = {};
        options.columns.forEach((key) => {
            if (options.transformations == null || options.transformations.group.includes(key)) {
                entry[options.key + "_" + key] = object[key];
            } else {
                entry[key] = object[key];
            }
        });
        return entry;
    }

    /**
     * Takes in a list of objects and returns an array of those objects grouped by unique combinations of keys
     */
    public static groupBy(list: any[], keys: string[]): any {
        let grouped: any = {};
        for (let entry of list) {
            let keyObject: any = {};
            keys.forEach((key) => keyObject[key] = entry[key]);
            let mapKey = JSON.stringify(keyObject);
            if (grouped[mapKey] != null) {
                grouped[mapKey].push(entry);
            } else {
                grouped[mapKey] = [entry];
            }
        }
        return grouped;
    }
}
