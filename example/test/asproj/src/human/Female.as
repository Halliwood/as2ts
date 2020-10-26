package human {
    public class Female extends Human {
        public function Female() {
            super();
            // as2ts-smart将识别出_gender是父类的属性并智能添加this指针
            _gender = EnumGender.Girl;
        }
    }
}