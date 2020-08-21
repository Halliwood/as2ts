package {
    import human.Male;
    import human.Female;
    public class Main {
        private var mike: Male;
        private var lily: Female;
        public function Main() {
            mike = new Male();
            lily = new Female();
            doSomething();
        }

        private function doSomething(): void {
            mike.hello();
            lily.hello();
        }
    }
}