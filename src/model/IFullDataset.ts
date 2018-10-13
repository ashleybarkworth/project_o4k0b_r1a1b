import {InsightDatasetKind} from "../controller/IInsightFacade";

export interface IDataSetEntry {
    [key: string]: any;
}

export interface IRoom extends IDataSetEntry {
    [key: string]: any;
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
