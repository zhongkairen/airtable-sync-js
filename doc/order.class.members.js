class ExampleClass {
  // 1. Static properties and methods
  static defaultValue = 42;

  // 1b. Static method
  static getDefault() {
    return ExampleClass.defaultValue;
  }

  // 2. Constants (could be grouped with static properties)
  static MAX_VALUE = 100;

  // 3. Constructor
  constructor(value) {
    this.value = value;
  }

  // 4. Public properties
  value;

  // 5. Private properties
  #privateValue;

  // 6. Public methods
  publicMethod() {
    console.log(this.value);
  }

  // 7. Getter/Setter Methods
  get privateValue() {
    return this.#privateValue;
  }

  set privateValue(value) {
    this.#privateValue = value;
  }

  // 8. Private methods
  #privateMethod() {
    console.log('Private method');
  }
}
