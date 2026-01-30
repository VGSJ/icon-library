/**
 * Tests for state.js - Centralized state management
 */

import state from "../src/components/state.js";

describe("AppState", () => {
  // Store original localStorage
  const originalStorage = global.localStorage;

  beforeEach(() => {
    // Create a mock storage
    const store = {};
    global.localStorage = {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach((key) => {
          delete store[key];
        });
      }),
    };

    // Reset state before each test
    state.setAllIcons([]);
    state.setCategory(null);
    state.setIcon(null);
    state.setFormat("svg");
    state.setSize(32);
    state.setSearchQuery("");
  });

  afterAll(() => {
    // Restore original localStorage
    global.localStorage = originalStorage;
  });

  describe("Icon management", () => {
    test("should set and get all icons", () => {
      const icons = [
        {
          name: "icon-1",
          category: { id: "hvac", name: "HVAC" },
          sizes: [16, 24, 32],
        },
        {
          name: "icon-2",
          category: { id: "hvac", name: "HVAC" },
          sizes: [16, 24, 32],
        },
      ];
      state.setAllIcons(icons);
      expect(state.allIcons).toEqual(icons);
    });

    test("should set and get selected icon", () => {
      const icon = {
        name: "icon-1",
        category: { id: "test", name: "Test" },
        sizes: [16, 24, 32],
      };
      state.setIcon(icon);
      expect(state.selectedIcon).toEqual(icon);
    });

    test("should filter icons by category", () => {
      const icons = [
        {
          name: "icon-1",
          category: { id: "hvac", name: "HVAC" },
          sizes: [16, 24, 32],
        },
        {
          name: "icon-2",
          category: { id: "hvac", name: "HVAC" },
          sizes: [16, 24, 32],
        },
        {
          name: "icon-3",
          category: { id: "valve", name: "Valve" },
          sizes: [16, 24, 32],
        },
      ];
      state.setAllIcons(icons);
      state.setCategory("hvac");
      state.filterIcons();
      expect(state.filteredIcons.length).toBe(2);
      expect(state.filteredIcons.every((i) => i.category.id === "hvac")).toBe(true);
    });

    test("should filter icons by search query", () => {
      const icons = [
        { name: "fire-alarm", category: { id: "safety", name: "Safety" } },
        { name: "fire-panel", category: { id: "control", name: "Control" } },
        { name: "water-valve", category: { id: "valve", name: "Valve" } },
      ];
      state.setAllIcons(icons);
      state.setSearchQuery("fire");
      const results = state.allIcons.filter((icon) => icon.name.toLowerCase().includes("fire"));
      expect(results.length).toBe(2);
    });
  });

  describe("Format and size management", () => {
    test("should set and get format", () => {
      state.setFormat("jsx");
      expect(state.detailsFormat).toBe("jsx");
    });

    test("should set and get size", () => {
      state.setSize(48);
      expect(state.detailsSize).toBe(48);
    });
  });

  describe("Category management", () => {
    test("should set and get category", () => {
      state.setCategory("hvac");
      expect(state.selectedCategory).toBe("hvac");
    });

    test("should clear category when set to null", () => {
      state.setCategory("hvac");
      expect(state.selectedCategory).toBe("hvac");
      state.setCategory(null);
      expect(state.selectedCategory).toBeNull();
    });
  });

  describe("Search management", () => {
    test("should set and get search query", () => {
      state.setSearchQuery("test");
      expect(state.searchQuery).toBe("test");
    });

    test("should clear search query", () => {
      state.setSearchQuery("test");
      state.setSearchQuery("");
      expect(state.searchQuery).toBe("");
    });
  });

  describe("Event emitter", () => {
    test("should emit categoryChanged event", (done) => {
      state.on("categoryChanged", (category) => {
        expect(category).toBe("hvac");
        done();
      });
      state.setCategory("hvac");
    });

    test("should emit iconSelected event", (done) => {
      const icon = { name: "test-icon", category: "test" };
      state.on("iconSelected", (selectedIcon) => {
        expect(selectedIcon).toEqual(icon);
        done();
      });
      state.setIcon(icon);
    });

    test("should emit formatChanged event", (done) => {
      state.on("formatChanged", (format) => {
        expect(format).toBe("css");
        done();
      });
      state.setFormat("css");
    });

    test("should emit sizeChanged event", (done) => {
      state.on("sizeChanged", (size) => {
        expect(size).toBe(40);
        done();
      });
      state.setSize(40);
    });

    test("should emit searchChanged event", (done) => {
      state.on("searchChanged", (query) => {
        expect(query).toBe("search-term");
        done();
      });
      state.setSearchQuery("search-term");
    });

    test("should emit iconsLoaded event", (done) => {
      const icons = [{ name: "icon-1", category: { id: "test", name: "Test" } }];
      state.on("iconsLoaded", (loadedIcons) => {
        expect(loadedIcons.icons).toEqual(icons);
        done();
      });
      state.setAllIcons(icons);
    });

    test("should handle multiple listeners for same event", () => {
      let callCount = 0;
      state.on("categoryChanged", () => {
        callCount++;
      });
      state.on("categoryChanged", () => {
        callCount++;
      });
      state.setCategory("test");
      expect(callCount).toBe(2);
    });
  });

  describe("Icon filtering", () => {
    test("should filter icons without category selection", () => {
      const icons = [
        { name: "icon-1", category: { id: "hvac", name: "HVAC" } },
        { name: "icon-2", category: { id: "valve", name: "Valve" } },
      ];
      state.setAllIcons(icons);
      state.setCategory(null);
      state.filterIcons();
      expect(state.filteredIcons).toEqual(icons);
    });

    test("should return empty array when no icons match category", () => {
      const icons = [{ name: "icon-1", category: { id: "hvac", name: "HVAC" } }];
      state.setAllIcons(icons);
      state.setCategory("nonexistent");
      state.filterIcons();
      expect(state.filteredIcons.length).toBe(0);
    });
  });
});
