import {Female} from "./human/Female";
import {Human} from "./human/Human";
import {Male} from "./human/Male";
export class Main {
    private mike: Male;
    private lily: Female;
    private people: Array<Human> = [];
    public constructor() {
        this.mike = new Male();
        this.lily = new Female();
        this.people.push(this.mike, this.lily);
        this.doSomething();
        this.mike.passToDo(function(lily: Male): void {
            lily.howOldAreYou();
        });
    }
    private doSomething(): void {
        for(let hm of this.people) {
            hm.hello();
        }
    }
}