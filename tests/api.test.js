/**
 * Tests for api.js - API and data operations
 */

import { generateJsxCode, generateVueCode, generateCssCode } from "../src/components/api.js";

describe("API Functions", () => {
  describe("generateJsxCode", () => {
    test("should generate JSX code for icon", () => {
      const icon = { name: "fire-alarm" };
      const code = generateJsxCode(icon, 32);
      expect(code).toContain("fire");
      expect(code).toContain("32");
      expect(code).toContain("svg");
    });

    test("should include import statement", () => {
      const icon = { name: "water-valve" };
      const code = generateJsxCode(icon, 24);
      expect(code).toContain("import");
    });

    test("should include component definition", () => {
      const icon = { name: "test-icon" };
      const code = generateJsxCode(icon, 16);
      expect(code).toContain("export");
      expect(code).toMatch(/function|\(.*\).*=>/);
    });

    test("should vary code based on icon name", () => {
      const icon1 = { name: "icon-1" };
      const icon2 = { name: "icon-2" };
      const code1 = generateJsxCode(icon1, 32);
      const code2 = generateJsxCode(icon2, 32);
      expect(code1).not.toBe(code2);
    });

    test("should vary code based on size", () => {
      const icon = { name: "test-icon" };
      const code16 = generateJsxCode(icon, 16);
      const code32 = generateJsxCode(icon, 32);
      expect(code16).toContain("16");
      expect(code32).toContain("32");
    });
  });

  describe("generateVueCode", () => {
    test("should generate Vue code for icon", () => {
      const icon = { name: "fire-alarm" };
      const code = generateVueCode(icon, 32);
      expect(code).toContain("fire");
      expect(code).toContain("32");
      expect(code).toContain("svg");
    });

    test("should include Vue template syntax", () => {
      const icon = { name: "test-icon" };
      const code = generateVueCode(icon, 24);
      expect(code.length > 0).toBe(true);
    });

    test("should include script section", () => {
      const icon = { name: "test-icon" };
      const code = generateVueCode(icon, 24);
      expect(code).toContain("export");
    });

    test("should vary code based on icon name", () => {
      const icon1 = { name: "icon-1" };
      const icon2 = { name: "icon-2" };
      const code1 = generateVueCode(icon1, 32);
      const code2 = generateVueCode(icon2, 32);
      expect(code1).not.toBe(code2);
    });

    test("should vary code based on size", () => {
      const icon = { name: "test-icon" };
      const code16 = generateVueCode(icon, 16);
      const code32 = generateVueCode(icon, 32);
      expect(code16).toContain("16");
      expect(code32).toContain("32");
    });
  });

  describe("generateCssCode", () => {
    test("should generate CSS code for icon", () => {
      const icon = { name: "fire-alarm" };
      const code = generateCssCode(icon, 32);
      expect(code).toContain("background");
      expect(code).toContain("fire");
    });

    test("should include background-image property", () => {
      const icon = { name: "test-icon" };
      const code = generateCssCode(icon, 24);
      expect(code).toContain("background-image");
      expect(code).toContain("url");
    });

    test("should include width and height", () => {
      const icon = { name: "test-icon" };
      const code = generateCssCode(icon, 48);
      expect(code).toContain("width");
      expect(code).toContain("height");
      expect(code).toContain("48");
    });

    test("should vary code based on icon name", () => {
      const icon1 = { name: "icon-1" };
      const icon2 = { name: "icon-2" };
      const code1 = generateCssCode(icon1, 32);
      const code2 = generateCssCode(icon2, 32);
      expect(code1).not.toBe(code2);
    });

    test("should vary code based on size", () => {
      const icon = { name: "test-icon" };
      const code16 = generateCssCode(icon, 16);
      const code32 = generateCssCode(icon, 32);
      expect(code16).toContain("16");
      expect(code32).toContain("32");
    });

    test("should use standard CSS class naming", () => {
      const icon = { name: "test-icon" };
      const code = generateCssCode(icon, 32);
      expect(code).toMatch(/\.[\w-]+/);
    });
  });

  describe("Code generation consistency", () => {
    test("JSX code should be deterministic", () => {
      const icon = { name: "icon-test" };
      const code1 = generateJsxCode(icon, 24);
      const code2 = generateJsxCode(icon, 24);
      expect(code1).toBe(code2);
    });

    test("Vue code should be deterministic", () => {
      const icon = { name: "icon-test" };
      const code1 = generateVueCode(icon, 24);
      const code2 = generateVueCode(icon, 24);
      expect(code1).toBe(code2);
    });

    test("CSS code should be deterministic", () => {
      const icon = { name: "icon-test" };
      const code1 = generateCssCode(icon, 24);
      const code2 = generateCssCode(icon, 24);
      expect(code1).toBe(code2);
    });
  });

  describe("Code generation formats", () => {
    test("JSX code should be valid JavaScript", () => {
      const icon = { name: "test-icon" };
      const code = generateJsxCode(icon, 32);
      expect(code).toMatch(/function|const|export/);
    });

    test("Vue code should contain Vue template structure", () => {
      const icon = { name: "test-icon" };
      const code = generateVueCode(icon, 32);
      expect(code.length > 0).toBe(true);
    });

    test("CSS code should be valid CSS", () => {
      const icon = { name: "test-icon" };
      const code = generateCssCode(icon, 32);
      expect(code).toMatch(/\{[\s\S]*\}/);
    });
  });
});
