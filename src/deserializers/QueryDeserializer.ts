import {IQuery} from "../model/Query";
import {InsightError} from "../controller/IInsightFacade";
import {IOptions, ITransformations} from "../model/Options";
import {OptionsDeserializer} from "./OptionsDeserializer";
import {IFilter} from "../model/Filter";
import {FilterDeserializer} from "./FilterDeserializer";
import {TransformationsDeserializer} from "./TransformationsDeserializer";

export class QueryDeserializer {
    public deserialize(json: any): IQuery {
        if (json == null || !json.hasOwnProperty("WHERE") || !json.hasOwnProperty("OPTIONS")) {
            throw new InsightError("Invalid query");
        }
        let transformations: ITransformations;
        if (Object.keys(json).includes("TRANSFORMATIONS")) {
            transformations = new TransformationsDeserializer().deserialize(json.TRANSFORMATIONS);
        }
        let options: IOptions = new OptionsDeserializer(transformations).deserialize(json.OPTIONS);
        let filter: IFilter = new FilterDeserializer(options.key).deserialize(json.WHERE, options.kind);
        return {
            options,
            filter
        };
    }
}
