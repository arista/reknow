require("jest")
import {getSortedInsertPosition} from "./Utils"
import {getSortedGE} from "./Utils"
import {getSortedGT} from "./Utils"
import {getSortedLE} from "./Utils"
import {getSortedLT} from "./Utils"
import {getSuperclass} from "./Utils"
import {isGetter} from "./Utils"
import {isSetter} from "./Utils"

describe("Utils", () => {
  describe("sorted list methods", () => {
    const compare0 = (v: number) => v - 0
    const compare1 = (v: number) => v - 1
    const compare2 = (v: number) => v - 2
    const compare3 = (v: number) => v - 3
    const compare4 = (v: number) => v - 4
    const compare5 = (v: number) => v - 5
    const compare6 = (v: number) => v - 6
    const compare7 = (v: number) => v - 7
    const compare8 = (v: number) => v - 8
    const l = [1, 2, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 7, 7, 7]
    describe("getSortedInsertPosition", () => {
      it("should return the expected values", () => {
        expect(getSortedInsertPosition([], compare4)).toBe(0)
        expect(getSortedInsertPosition([3], compare4)).toBe(1)
        expect(getSortedInsertPosition([5], compare4)).toBe(0)
        expect(getSortedInsertPosition([4], compare4)).toBe(0)
        expect(getSortedInsertPosition([1, 2], compare4)).toBe(2)
        expect(getSortedInsertPosition([5, 6], compare4)).toBe(0)
        expect(getSortedInsertPosition([1, 5, 6], compare4)).toBe(1)
        expect(getSortedInsertPosition([1, 2, 3, 5], compare4)).toBe(3)
      })
    })
    describe("getSortedGE", () => {
      it("should return the expected values", () => {
        expect(getSortedGE([], compare4)).toBe(0)
        expect(getSortedGE([5], compare4)).toBe(0)
        expect(getSortedGE([3], compare4)).toBe(1)
        expect(getSortedGE([4], compare4)).toBe(0)
        expect(getSortedGE([1, 2, 3, 4, 5, 6, 7], compare4)).toBe(3)
        expect(getSortedGE([1, 2, 3, 4, 5, 6, 7], compare5)).toBe(4)

        expect(getSortedGE(l, compare0)).toBe(0)
        expect(getSortedGE(l, compare1)).toBe(0)
        expect(getSortedGE(l, compare2)).toBe(1)
        expect(getSortedGE(l, compare3)).toBe(2)
        expect(getSortedGE(l, compare4)).toBe(5)
        expect(getSortedGE(l, compare5)).toBe(10)
        expect(getSortedGE(l, compare6)).toBe(12)
        expect(getSortedGE(l, compare7)).toBe(12)
        expect(getSortedGE(l, compare8)).toBe(15)
      })
    })
    describe("getSortedGT", () => {
      it("should return the expected values", () => {
        expect(getSortedGT([], compare4)).toBe(0)
        expect(getSortedGT([5], compare4)).toBe(0)
        expect(getSortedGT([3], compare4)).toBe(1)
        expect(getSortedGT([4], compare4)).toBe(1)
        expect(getSortedGT([1, 2, 3, 4, 5, 6, 7], compare4)).toBe(4)
        expect(getSortedGT([1, 2, 3, 4, 5, 6, 7], compare5)).toBe(5)

        expect(getSortedGT(l, compare0)).toBe(0)
        expect(getSortedGT(l, compare1)).toBe(1)
        expect(getSortedGT(l, compare2)).toBe(2)
        expect(getSortedGT(l, compare3)).toBe(5)
        expect(getSortedGT(l, compare4)).toBe(10)
        expect(getSortedGT(l, compare5)).toBe(12)
        expect(getSortedGT(l, compare6)).toBe(12)
        expect(getSortedGT(l, compare7)).toBe(15)
        expect(getSortedGT(l, compare8)).toBe(15)
      })
    })
    describe("getSortedLE", () => {
      it("should return the expected values", () => {
        expect(getSortedLE([], compare4)).toBe(-1)
        expect(getSortedLE([5], compare4)).toBe(-1)
        expect(getSortedLE([3], compare4)).toBe(0)
        expect(getSortedLE([4], compare4)).toBe(0)
        expect(getSortedLE([1, 2, 3, 4, 5, 6, 7], compare4)).toBe(3)
        expect(getSortedGE([1, 2, 3, 4, 5, 6, 7], compare5)).toBe(4)

        expect(getSortedLE(l, compare0)).toBe(-1)
        expect(getSortedLE(l, compare1)).toBe(0)
        expect(getSortedLE(l, compare2)).toBe(1)
        expect(getSortedLE(l, compare3)).toBe(4)
        expect(getSortedLE(l, compare4)).toBe(9)
        expect(getSortedLE(l, compare5)).toBe(11)
        expect(getSortedLE(l, compare6)).toBe(11)
        expect(getSortedLE(l, compare7)).toBe(14)
      })
    })
    describe("getSortedLT", () => {
      it("should return the expected values", () => {
        expect(getSortedLT([], compare4)).toBe(-1)
        expect(getSortedLT([5], compare4)).toBe(-1)
        expect(getSortedLT([3], compare4)).toBe(0)
        expect(getSortedLT([4], compare4)).toBe(-1)
        expect(getSortedLT([1, 2, 3, 4, 5, 6, 7], compare4)).toBe(2)
        expect(getSortedLT([1, 2, 3, 4, 5, 6, 7], compare5)).toBe(3)

        expect(getSortedLT(l, compare0)).toBe(-1)
        expect(getSortedLT(l, compare1)).toBe(-1)
        expect(getSortedLT(l, compare2)).toBe(0)
        expect(getSortedLT(l, compare3)).toBe(1)
        expect(getSortedLT(l, compare4)).toBe(4)
        expect(getSortedLT(l, compare5)).toBe(9)
        expect(getSortedLT(l, compare6)).toBe(11)
        expect(getSortedLT(l, compare7)).toBe(11)
        expect(getSortedLT(l, compare8)).toBe(14)
      })
    })
  })
  describe("getSuperclass", () => {
    class A {}
    class B extends A {}
    class C1 extends B {}
    class C2 extends B {}

    expect(getSuperclass(A)).toBe(null)
    expect(getSuperclass(B)).toBe(A)
    expect(getSuperclass(C1)).toBe(B)
    expect(getSuperclass(C2)).toBe(B)
  })
  describe("isGetter", () => {
    it("should return false for a nonexistent property", () => {
      class A {}
      const a = new A()
      expect(isGetter(a, "val")).toBe(false)
    })
    it("should return false for a property set on the object", () => {
      class A {
        val!: string
      }
      const a = new A()
      a.val = "abc"
      expect(isGetter(a, "val")).toBe(false)
    })
    it("should return true for a getter on the class", () => {
      class A {
        get val() {
          return 0
        }
      }
      const a = new A()
      expect(isGetter(a, "val")).toBe(true)
    })
    it("should return true for a getter on the superclass", () => {
      class A {
        get val() {
          return 0
        }
      }
      class A2 extends A {}
      const a = new A2()
      expect(isGetter(a, "val")).toBe(true)
    })
    it("should return false for a property shadowing a getter", () => {
      class A {
        get val() {
          return 0
        }
      }
      const a = new A()
      Object.defineProperty(a, "val", {value: 10})
      expect(isGetter(a, "val")).toBe(false)
    })
  })
  describe("isSetter", () => {
    it("should return false for a nonexistent property", () => {
      class A {}
      const a = new A()
      expect(isSetter(a, "val")).toBe(false)
    })
    it("should return false for a property set on the object", () => {
      class A {
        val!: string
      }
      const a = new A()
      a.val = "abc"
      expect(isSetter(a, "val")).toBe(false)
    })
    it("should return true for a setter on the class", () => {
      class A {
        set val(v: string) {}
      }
      const a = new A()
      expect(isSetter(a, "val")).toBe(true)
    })
    it("should return true for a setter on the superclass", () => {
      class A {
        set val(v: string) {}
      }
      class A2 extends A {}
      const a = new A2()
      expect(isSetter(a, "val")).toBe(true)
    })
    it("should return false for a property shadowing a setter", () => {
      class A {
        set val(v: string) {}
      }
      const a = new A()
      Object.defineProperty(a, "val", {value: 10})
      expect(isSetter(a, "val")).toBe(false)
    })
  })
})
