import {InsightDatasetKind} from "../controller/IInsightFacade";
import {Apply} from "./Apply";

export interface IOptions {
    key: string;
    kind: InsightDatasetKind;
    columns: string[];
    order?: IOrder;
    transformations?: ITransformations;
}

export interface ITransformations {
    group: string[];
    apply: Apply[];
    key: string;
    kind: InsightDatasetKind;
}

export interface IOrder {
    dir: SortDirection;
    keys: string[];
}

export enum SortDirection {
    UP,
    DOWN
}
