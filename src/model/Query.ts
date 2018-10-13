import {IOptions} from "./Options";
import {IFilter} from "./Filter";

export interface IQuery {
    options: IOptions;
    filter: IFilter;
}
