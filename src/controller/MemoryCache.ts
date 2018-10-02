import {IFullDataset} from "../model/IFullDataset";

export class MemoryCache {
    private loadedDataSets: IFullDataset[];

    public constructor() {
        this.loadedDataSets = [];
    }

    public getLoadedDataSets() {
        return this.loadedDataSets;
    }

    public addLoadedDataSet(dataset: IFullDataset) {
        this.loadedDataSets.push(dataset);
    }

    public containsId(id: string) {
        return this.loadedDataSets.some((dataset) => dataset.id === id);
    }

    public getByKey(key: string) {
        return this.loadedDataSets.find((dataset) => dataset.id === key);
    }

    /**
     * Removes the dataset with the given id, if it's present
     * @param id
     */
    public removeDataSet(id: string) {
        let datasetPosition: number = this.loadedDataSets.findIndex((dataset) => dataset.id === id);

        if (datasetPosition !== -1) {
            this.loadedDataSets.splice(datasetPosition, 1);
        }
    }
}
