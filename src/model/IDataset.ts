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
}

export interface IDataset {
    id: string;
    sections: ICourseSection[];
}
