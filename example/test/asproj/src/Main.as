package {
    import human.Female;
    import human.Human;
    import human.Male;
    public class Main {
        private var mike: Male;
        private var lily: Female;
        // Vector类型翻译
        private var people: Vector.<Human> = new Vector.<Human>();
        public function Main() {
            // as2ts-smart将智能添加this指针
            mike = new Male();
            lily = new Female();
            people.push(mike, lily);
            doSomething();
            mike.passToDo(function(lily: Male):void {
                // 此处的lily是匿名函数的参数，不会添加this指针
                lily.howOldAreYou();
            })
        }

        private function doSomething(): void {
            // for each语句翻译
            for each(var hm in people) {
                hm.hello();
            }
        }
    }
}