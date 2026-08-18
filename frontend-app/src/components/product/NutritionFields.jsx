import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Structured nutrition data, stored server-side as a JSON string in Product.nutritionInfo.
// All fields are optional — a buyer's comparison table will just show "—" for blanks.
const FIELDS = [
  { key: "calories", label: "Calories (kcal, per 100g)" },
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Carbohydrates (g)" },
  { key: "fat", label: "Fat (g)" },
  { key: "fiber", label: "Fiber (g)" },
  { key: "vitamins", label: "Vitamins / Minerals (free text)" },
]

function NutritionFields({ value = {}, onChange }) {
  const handleFieldChange = (key, fieldValue) => {
    onChange({ ...value, [key]: fieldValue })
  }

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
      <Label className="text-sm font-semibold">Nutritional Information (optional)</Label>
      <p className="text-xs text-muted-foreground">
        Helps buyers compare products. Leave blank if not applicable.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={`nutrition-${key}`} className="text-xs">{label}</Label>
            <Input
              id={`nutrition-${key}`}
              name={key}
              type={key === "vitamins" ? "text" : "number"}
              min={key === "vitamins" ? undefined : "0"}
              step={key === "vitamins" ? undefined : "0.1"}
              placeholder={key === "vitamins" ? "e.g. Vitamin C, Iron" : "0"}
              value={value[key] || ""}
              onChange={(e) => handleFieldChange(key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default NutritionFields