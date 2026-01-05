'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Button, 
  Input, 
  Textarea, 
  Label, 
  Select, 
  Card, 
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge
} from '@ouiboo/ui';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Calendar, 
  Info, 
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  X
} from 'lucide-react';
import { cn } from '@ouiboo/ui/utils';

// Combined Schema for the Multi-step form
const TripFormSchema = z.object({
  title: z.string().min(5, "Title is too short"),
  category: z.enum(["ADVENTURE", "CULTURAL", "LUXURY", "BUDGET"]),
  description: z.string().min(20, "Please provide a more detailed description"),
  startLocation: z.string().min(2, "Location is required"),
  durationDays: z.coerce.number().min(1),
  durationNights: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  totalSeats: z.coerce.number().min(1),
  startDate: z.string(),
  endDate: z.string(),
  images: z.array(z.string()).min(1, "At least one image is required"),
  inclusions: z.array(z.string()).min(1, "At least one inclusion is required"),
});

type TripFormValues = z.infer<typeof TripFormSchema>;

export default function NewTripPage() {
  const [activeTab, setActiveTab] = useState("basic");
  const [previews, setPreviews] = useState<string[]>([]);

  const { register, handleSubmit, control, setValue, watch, formState: { errors, isValid } } = useForm<TripFormValues>({
    resolver: zodResolver(TripFormSchema),
    defaultValues: {
      category: "ADVENTURE",
      durationDays: 1,
      durationNights: 0,
      images: [],
      inclusions: ["Guided tour", "Transportation"],
    }
  });

  const { fields: inclusionFields, append: appendInclusion, remove: removeInclusion } = useFieldArray({
    control,
    name: "inclusions" as any
  });

  const onSubmit = (data: TripFormValues) => {
    console.log("Submitting Trip:", data);
    // Handle API call here
  };

  const nextStep = (tab: string) => setActiveTab(tab);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight">Create New Adventure</h1>
          <p className="text-muted-foreground font-medium mt-1">Fill in the details to publish your next trip to the marketplace.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl font-bold">Save Draft</Button>
          <Button onClick={handleSubmit(onSubmit)} className="bg-primary hover:bg-primary/90 rounded-xl font-black px-8">Publish Trip</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 rounded-2xl bg-muted/50 p-1 mb-8">
          <TabsTrigger value="basic" className="rounded-xl font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current text-[10px] font-black">1</span>
            Basic Details
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-xl font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current text-[10px] font-black">2</span>
            Dates & Inventory
          </TabsTrigger>
          <TabsTrigger value="media" className="rounded-xl font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current text-[10px] font-black">3</span>
            Media & Visuals
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabsContent value="basic">
            <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Trip Title</Label>
                    <Input 
                        {...register("title")}
                        placeholder="e.g. Sahara Desert Expedition" 
                        className="h-14 rounded-2xl bg-muted/30 border-none font-bold text-lg" 
                    />
                    {errors.title && <p className="text-xs text-red-500 font-bold">{errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Category</Label>
                    <Select {...register("category")}>
                        <option value="ADVENTURE">Adventure</option>
                        <option value="CULTURAL">Cultural</option>
                        <option value="LUXURY">Luxury</option>
                        <option value="BUDGET">Budget</option>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Description</Label>
                  <Textarea 
                    {...register("description")}
                    placeholder="Describe the magical experience..." 
                    className="min-h-[200px] rounded-[2rem] bg-muted/30 border-none font-medium text-lg p-6 lg:p-8" 
                  />
                  {errors.description && <p className="text-xs text-red-500 font-bold">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Start Location</Label>
                        <Input {...register("startLocation")} placeholder="Marrakech, Morocco" className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Duration (Days)</Label>
                        <Input type="number" {...register("durationDays")} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nights</Label>
                        <Input type="number" {...register("durationNights")} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                    </div>
                </div>

                <div className="flex justify-end pt-6">
                  <Button type="button" onClick={() => nextStep("inventory")} className="rounded-2xl h-14 px-10 font-black gap-3 group">
                    Next Step <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
               <CardContent className="p-10 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Calendar className="h-5 w-5" /></div>
                            <h3 className="text-xl font-black font-display tracking-tight text-foreground">Scheduling</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Start Date</Label>
                                <Input type="date" {...register("startDate")} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">End Date</Label>
                                <Input type="date" {...register("endDate")} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                            </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Info className="h-5 w-5" /></div>
                            <h3 className="text-xl font-black font-display tracking-tight text-foreground">Capacity & Pricing</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Seats</Label>
                                <Input type="number" {...register("totalSeats")} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Price (MAD)</Label>
                                <Input type="number" {...register("price")} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                            </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black font-display tracking-tight text-foreground">What's Included?</h3>
                        <Button type="button" variant="outline" size="sm" onClick={() => appendInclusion("")} className="rounded-full h-8 px-4 font-bold text-[10px] uppercase tracking-widest gap-2">
                            <Plus className="h-3 w-3" /> Add Item
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inclusionFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2">
                                <Input 
                                    {...register(`inclusions.${index}` as const)} 
                                    className="h-12 rounded-xl bg-muted/30 border-none font-semibold flex-1" 
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeInclusion(index)} className="text-red-500 hover:bg-red-50 rounded-xl shrink-0">
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex justify-between pt-6">
                    <Button type="button" variant="ghost" onClick={() => nextStep("basic")} className="rounded-2xl h-14 px-10 font-black gap-3 group">
                      <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" /> Previous
                    </Button>
                    <Button type="button" onClick={() => nextStep("media")} className="rounded-2xl h-14 px-10 font-black gap-3 group">
                      Next Step <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media">
            <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
               <CardContent className="p-10 space-y-10">
                  <div className="space-y-4">
                     <h3 className="text-2xl font-black font-display tracking-tight text-foreground">Trip Gallery</h3>
                     <p className="text-muted-foreground font-medium">Add at least one high-quality cover photo and additional shots of the experience.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {/* Placeholder Upload Box */}
                    <div 
                        className="aspect-square rounded-[2rem] border-4 border-dashed border-muted flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/30 transition-all group"
                        onClick={() => {
                            // Mock adding image URL for now
                            const url = `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1489749798305-4fea3ae63d43' : '1539635278303-d4002c07eae3'}?q=80&w=2070&auto=format&fit=crop`;
                            const current = watch("images") || [];
                            setValue("images", [...current, url]);
                            setPreviews([...previews, url]);
                        }}
                    >
                        <UploadCloud className="h-10 w-10 text-muted-foreground group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload Image</span>
                    </div>

                    <AnimatePresence>
                        {previews.map((url, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="aspect-square rounded-[2rem] overflow-hidden relative group"
                            >
                                <img src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-white hover:bg-white/20 rounded-full"
                                        onClick={() => {
                                            const newImages = (watch("images") || []).filter((_, i) => i !== idx);
                                            setValue("images", newImages);
                                            setPreviews(previews.filter((_, i) => i !== idx));
                                        }}
                                    >
                                        <X className="h-6 w-6" />
                                    </Button>
                                </div>
                                {idx === 0 && (
                                    <Badge className="absolute top-4 left-4 bg-primary text-white border-none shadow-lg text-[8px] font-black uppercase tracking-widest">Cover</Badge>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>

                  <div className="p-8 bg-blue-50 dark:bg-blue-950/20 rounded-3xl border border-blue-100 dark:border-blue-900/50 flex gap-6 mt-12">
                     <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shrink-0"><ImageIcon className="h-6 w-6" /></div>
                     <div className="space-y-1">
                        <h4 className="font-bold text-blue-900 dark:text-blue-200">Pro Tip for Media</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Horizontal (landscape) images work best for the marketplace carousel. Aim for 1920x1080 resolution.</p>
                     </div>
                  </div>

                  <div className="flex justify-between pt-12 border-t mt-12">
                     <Button type="button" variant="ghost" onClick={() => nextStep("inventory")} className="rounded-2xl h-14 px-10 font-black gap-3 group">
                        <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" /> Previous
                     </Button>
                     <Button type="submit" className="rounded-2xl h-14 px-12 font-black gap-3 bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-lg shadow-emerald-900/10">
                        <CheckCircle2 className="h-5 w-5" /> Launch Trip
                     </Button>
                  </div>
               </CardContent>
            </Card>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
}
