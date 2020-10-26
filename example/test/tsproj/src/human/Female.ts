import {Human} from "./Human";
import {EnumGender} from "./EnumGender";
export class Female extends Human {
    public constructor() {
        super();
        this._gender = EnumGender.Girl;
    }
}