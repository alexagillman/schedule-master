import { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { format, addDays, subDays, parseISO, isSameDay } from 'date-fns'
import { Plus, ChevronLeft, ChevronRight, Clock, Calendar, Pencil, Trash2 } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { eventCollection } from '@/lib/data'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
}).refine((data) => {
  const start = data.startTime
  const end = data.endTime
  return start < end
}, {
  message: "End time must be after start time",
  path: ["endTime"]
})

type EventFormData = z.infer<typeof eventFormSchema>

function App() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
    }
  })

  // Fetch events for selected date
  const { data: events = [] } = useQuery({
    queryKey: ['events', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const allEvents = await eventCollection.getAll()
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      return allEvents
        .filter(event => event.date === dateStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
  })

  // Create event mutation
  const createEvent = useMutation({
    mutationFn: (data: EventFormData) => eventCollection.insert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setIsDialogOpen(false)
      form.reset()
      toast.success('Event created successfully!')
    }
  })

  // Update event mutation
  const updateEvent = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<EventFormData> }) =>
      eventCollection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setIsDialogOpen(false)
      setEditingEvent(null)
      form.reset()
      toast.success('Event updated successfully!')
    }
  })

  // Delete event mutation
  const deleteEvent = useMutation({
    mutationFn: (id: string) => eventCollection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast.success('Event deleted successfully!')
    }
  })

  const onSubmit = (data: EventFormData) => {
    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent._id, data })
    } else {
      createEvent.mutate(data)
    }
  }

  const handleEditEvent = (event: any) => {
    setEditingEvent(event)
    form.reset({
      title: event.title,
      description: event.description || '',
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
    })
    setIsDialogOpen(true)
  }

  const handleAddEvent = () => {
    setEditingEvent(null)
    form.reset({
      title: '',
      description: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
    })
    setIsDialogOpen(true)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return format(date, 'h:mm a')
  }

  const isToday = isSameDay(selectedDate, new Date())
  const isPast = selectedDate < new Date() && !isToday

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Schedule App</h1>
          <p className="text-muted-foreground">Organize your day with ease</p>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                {isToday && <span className="ml-2 text-sm text-accent font-medium">Today</span>}
              </h2>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddEvent}>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Event title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Event description"
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingEvent ? 'Update Event' : 'Create Event'}
                    </Button>
                    {editingEvent && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          deleteEvent.mutate(editingEvent._id)
                          setIsDialogOpen(false)
                          setEditingEvent(null)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {events.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No events scheduled
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {isToday 
                    ? "You have a free day ahead!" 
                    : `No events planned for ${format(selectedDate, 'MMMM d')}`
                  }
                </p>
                <Button onClick={handleAddEvent} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first event
                </Button>
              </CardContent>
            </Card>
          ) : (
            events.map((event) => (
              <Card 
                key={event._id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isPast ? 'opacity-60' : ''
                }`}
                onClick={() => handleEditEvent(event)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground mb-1">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </span>
                      </div>
                    </div>
                    <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Navigation */}
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            disabled={isToday}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(new Date(), 1))}
          >
            Tomorrow
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(addDays(new Date(), 7))}
          >
            Next Week
          </Button>
        </div>
      </div>
    </div>
  )
}

export default App