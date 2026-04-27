import { Card } from "@/components/ui/card";
export default function TemplatesPage() {
  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold">Commercial Templates</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Template management UI is coming in the next iteration. For now, new documents use the
        built-in Jeena Seekho skeletons (MoU and Pricing Addendum). You can edit any document freely
        after creation.
      </p>
    </Card>
  );
}
