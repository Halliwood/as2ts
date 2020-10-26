export class Human {
    protected _name: string;
    protected _age: number;
    protected _gender: number;
    public constructor() {
        
    }
    public set age(value: number) {
        if(value < this._age ) {
            console.log("I become younger");
        } else if(value > this._age ) {
            console.log("I become oldder");
        } 
        this._age = value;
    }
    public hello(): void {
        console.log("I'm " + this._name + ".");
    }
    public howOldAreYou(): void {
        console.log("I'm " + this._age);
    }
    public passToDo(callback: Function): void {
        callback();
    }
}