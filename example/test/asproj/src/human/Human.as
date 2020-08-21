package human {
    public class Human {
        protected var _name: String;
        protected var _age: int;
        protected var _gender: int;

        public function Human() {
            super();
        }

        public function set age(value: String): void {
            if(value < _age) {
                trace("I become younger");
            } else if(value > _age) {
                trace("I become oldder");
            }
            _age = value;
        }

        public function hello(): void {
            trace("I'm " + _name + ".");
        }
    }
}