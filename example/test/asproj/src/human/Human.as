package human {
    public class Human {
        // 变量类型将被替换
        protected var _name: String;
        protected var _age: int;
        protected var _gender: int;

        public function Human() {
            super();
        }

        public function set age(value: int): void {
            // 这里缺省了this指针
            if(value < _age) {
                // trace将被替换为console.log
                trace("I become younger");
            } else if(value > _age) {
                trace("I become oldder");
            }
            _age = value;
        }

        public function hello(): void {
            trace("I'm " + _name + ".");
        }

        public function howOldAreYou(): void {
            trace("I'm " + _age);
        }

        public function passToDo(callback: Function): void {
            callback();
        }
    }
}