package human {
    // 同目录下的Human的import缺省了，as2ts-smart将智能import
    public class Male extends Human {
        public function Male() {
            super();
            // as2ts-smart将识别出_gender是父类的属性并智能添加this指针
            _gender = EnumGender.Boy;
        }
    }
}