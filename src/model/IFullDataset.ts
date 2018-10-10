import {InsightDatasetKind} from "../controller/IInsightFacade";

<<<<<<< HEAD
export interface IDataSetEntry {
    [key: string]: any;
}

export interface IRoom extends IDataSetEntry {
    [key: string]: any;
=======
export interface IDataSetEntry {}

export interface IRoom extends IDataSetEntry {
    fullname: string;
    shortname: string;
    number: string;
    name: string;
    address: string;
    lat: number;
    lon: number;
    seats: number;
    type: string;
    furniture: string;
    href: string;
>>>>>>> added parseBuildings + parseBuilding
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
