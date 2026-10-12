import { describe, expect, it } from "vitest"
import { nextTick, ref } from "vue"
import { useCardDraft } from "../useCardDraft"

type Slice = { name: string; brand: string }

describe("useCardDraft", () => {
  it("seeds asynchronously and flips dirty on edit (regression: dirty must track the late seed)", async () => {
    const source = ref<Slice | null>(null)
    const card = useCardDraft(source)
    expect(card.dirty.value).toBe(false)

    source.value = { name: "Tee", brand: "PIM" }
    await nextTick()
    expect(card.draft.name).toBe("Tee")
    expect(card.dirty.value).toBe(false)

    card.draft.brand = "PIM Co."
    expect(card.dirty.value).toBe(true)
    expect(card.changes()).toEqual({ brand: "PIM Co." })
  })

  it("reseeds from a refetch only while clean", async () => {
    const source = ref<Slice | null>({ name: "Tee", brand: "PIM" })
    const card = useCardDraft(source)

    source.value = { name: "Tee v2", brand: "PIM" }
    await nextTick()
    expect(card.draft.name).toBe("Tee v2") // clean → reseeded

    card.draft.brand = "edited"
    source.value = { name: "Tee v3", brand: "PIM" }
    await nextTick()
    expect(card.draft.name).toBe("Tee v2") // dirty → draft held
    expect(card.staleUnderEdit.value).toBe(true)
  })

  it("reset returns the draft to the latest source", async () => {
    const source = ref<Slice | null>({ name: "Tee", brand: "PIM" })
    const card = useCardDraft(source)
    card.draft.brand = "edited"
    source.value = { name: "Tee v2", brand: "PIM" }
    await nextTick()

    card.reset()
    expect(card.draft.name).toBe("Tee v2")
    expect(card.dirty.value).toBe(false)
    expect(card.staleUnderEdit.value).toBe(false)
  })

  it("counts a key added after seeding as an edit and holds it through a refetch", async () => {
    const source = ref<Record<string, string> | null>({})
    const card = useCardDraft(source)
    expect(card.dirty.value).toBe(false)

    card.draft["DEFAULT_PRICE|USD"] = "12"
    expect(card.dirty.value).toBe(true)
    expect(card.changes()).toEqual({ "DEFAULT_PRICE|USD": "12" })

    source.value = {}
    await nextTick()
    expect(card.draft["DEFAULT_PRICE|USD"]).toBe("12") // dirty → copied value held

    card.reset()
    expect(card.draft["DEFAULT_PRICE|USD"]).toBeUndefined()
    expect(card.dirty.value).toBe(false)
  })

  it("treats empty string and null as equal (clearing semantics)", async () => {
    const source = ref<{ note: string | null } | null>({ note: null })
    const card = useCardDraft(source)
    await nextTick()
    card.draft.note = ""
    expect(card.dirty.value).toBe(false)
  })
})
