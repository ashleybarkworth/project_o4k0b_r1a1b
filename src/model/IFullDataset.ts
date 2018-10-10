import {InsightDatasetKind} from "../controller/IInsightFacade";

export interface IDataSetEntry {
}

export interface IRoom extends IDataSetEntry {
    // TODO
}

export interface ICourseSection extends IDataSetEntry {
    id: string;
    dept: string;
    avg: number;
    instructor: string;
    title: string;
    pass: number;
    fail: number;
    audit: number;
    uuid: string;
    year: number;
    [key: string]: any;
}

export interface IFullDataset {
    id: string;
    kind: InsightDatasetKind;
    entries: IDataSetEntry[];
}
