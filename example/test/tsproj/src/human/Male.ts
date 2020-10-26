import {Human} from "./Human";
import {EnumGender} from "./EnumGender";
export class Male extends Human {
    public constructor() {
        super();
        this._gender = EnumGender.Boy;
    }
}