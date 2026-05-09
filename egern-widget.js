export default async function(ctx) {
  return {
    type: "widget",
    padding: 16,
    gap: 8,
    backgroundColor: "#1A1A2E",
    children: [
      {
        type: "text",
        text: "Egern",
        font: { size: "headline", weight: "bold" },
        textColor: "#FFFFFF"
      },
      {
        type: "text",
        text: "Widget OK",
        font: { size: "subheadline", weight: "medium" },
        textColor: "#34C759"
      }
    ]
  };
}
