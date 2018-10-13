import {InsightDatasetKind} from "../controller/IInsightFacade";
import {Apply} from "./Apply";

export interface IOptions {
    key: string;
    kind: InsightDatasetKind;
    columns: string[];
    order?: string;
    transformations?: ITransformations;
}

export interface ITransformations {
    group: string[];
    apply: Apply[];
    key: string;
    kind: InsightDatasetKind;
}
