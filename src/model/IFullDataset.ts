export interface ICourseSection {
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
    sections: ICourseSection[];
}