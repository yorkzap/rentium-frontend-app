'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoveRight, MoveLeft, Calendar, CheckSquare } from 'lucide-react';

export default function MoveInOut() {
  // Mock data for move-ins and move-outs
  const moveIns = [
    {
      id: 1,
      tenant: 'James Wilson',
      property: '123 Main St, Apt 4B',
      moveInDate: 'Apr 15, 2023',
      leaseStart: 'Apr 15, 2023',
      leaseEnd: 'Apr 14, 2024',
      status: 'Scheduled',
      depositPaid: true,
    },
    {
      id: 2,
      tenant: 'Emily Johnson',
      property: '456 Park Ave',
      moveInDate: 'May 1, 2023',
      leaseStart: 'May 1, 2023',
      leaseEnd: 'Apr 30, 2024',
      status: 'Pending',
      depositPaid: false,
    },
  ];

  const moveOuts = [
    {
      id: 1,
      tenant: 'Michael Brown',
      property: '789 Oak Rd',
      moveOutDate: 'Apr 30, 2023',
      leaseEnd: 'Apr 30, 2023',
      status: 'Scheduled',
      inspectionDate: 'Apr 28, 2023',
      depositReturn: 'Pending',
    },
    {
      id: 2,
      tenant: 'Sarah Davis',
      property: '101 Pine St, Room 3',
      moveOutDate: 'May 15, 2023',
      leaseEnd: 'May 15, 2023',
      status: 'Confirmed',
      inspectionDate: 'May 12, 2023',
      depositReturn: 'Pending',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-ink">Move In/Out Management</h1>
        <div className="flex space-x-2">
          <Button variant="outline">
            <MoveLeft className="h-4 w-4 mr-1" /> Schedule Move-Out
          </Button>
          <Button className="">
            <MoveRight className="h-4 w-4 mr-1" /> Schedule Move-In
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Upcoming Move-Ins
                </p>
                <p className="text-2xl font-bold">2</p>
              </div>
              <div className="p-2 rounded-full bg-green-100 text-green-700">
                <MoveRight className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-2">
              {moveIns.map((moveIn) => (
                <div
                  key={moveIn.id}
                  className="p-2 bg-canvas rounded-md text-sm"
                >
                  <div className="flex justify-between">
                    <div className="font-medium">{moveIn.tenant}</div>
                    <div
                      className={`text-xs px-2 py-1 rounded-full ${
                        moveIn.status === 'Scheduled'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {moveIn.status}
                    </div>
                  </div>
                  <div className="text-ink-3 mt-1">{moveIn.property}</div>
                  <div className="flex justify-between mt-2 text-xs">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" /> {moveIn.moveInDate}
                    </div>
                    <div className="flex items-center">
                      <CheckSquare className="h-3 w-3 mr-1" /> Deposit:{' '}
                      {moveIn.depositPaid ? 'Paid' : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Upcoming Move-Outs
                </p>
                <p className="text-2xl font-bold">2</p>
              </div>
              <div className="p-2 rounded-full bg-amber-100 text-amber-700">
                <MoveLeft className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-2">
              {moveOuts.map((moveOut) => (
                <div
                  key={moveOut.id}
                  className="p-2 bg-canvas rounded-md text-sm"
                >
                  <div className="flex justify-between">
                    <div className="font-medium">{moveOut.tenant}</div>
                    <div
                      className={`text-xs px-2 py-1 rounded-full ${
                        moveOut.status === 'Scheduled'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {moveOut.status}
                    </div>
                  </div>
                  <div className="text-ink-3 mt-1">{moveOut.property}</div>
                  <div className="flex justify-between mt-2 text-xs">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />{' '}
                      {moveOut.moveOutDate}
                    </div>
                    <div className="flex items-center">
                      <CheckSquare className="h-3 w-3 mr-1" /> Inspection:{' '}
                      {moveOut.inspectionDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="moveins">
        <TabsList>
          <TabsTrigger value="moveins">Move-Ins</TabsTrigger>
          <TabsTrigger value="moveouts">Move-Outs</TabsTrigger>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
        </TabsList>

        <TabsContent value="moveins" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Move-Ins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-6 bg-canvas p-3 text-sm font-medium text-ink-2">
                  <div>Tenant</div>
                  <div>Property</div>
                  <div>Move-In Date</div>
                  <div>Lease Period</div>
                  <div>Status</div>
                  <div></div>
                </div>

                {moveIns.map((moveIn) => (
                  <div
                    key={moveIn.id}
                    className="grid grid-cols-6 border-t p-3 text-sm"
                  >
                    <div className="font-medium">{moveIn.tenant}</div>
                    <div>{moveIn.property}</div>
                    <div>{moveIn.moveInDate}</div>
                    <div>
                      {moveIn.leaseStart} to {moveIn.leaseEnd}
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          moveIn.status === 'Scheduled'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {moveIn.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <Button variant="ghost" size="sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moveouts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Move-Outs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-7 bg-canvas p-3 text-sm font-medium text-ink-2">
                  <div>Tenant</div>
                  <div>Property</div>
                  <div>Move-Out Date</div>
                  <div>Inspection Date</div>
                  <div>Status</div>
                  <div>Deposit Return</div>
                  <div></div>
                </div>

                {moveOuts.map((moveOut) => (
                  <div
                    key={moveOut.id}
                    className="grid grid-cols-7 border-t p-3 text-sm"
                  >
                    <div className="font-medium">{moveOut.tenant}</div>
                    <div>{moveOut.property}</div>
                    <div>{moveOut.moveOutDate}</div>
                    <div>{moveOut.inspectionDate}</div>
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          moveOut.status === 'Scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {moveOut.status}
                      </span>
                    </div>
                    <div>{moveOut.depositReturn}</div>
                    <div className="text-right">
                      <Button variant="ghost" size="sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">
                Move-In/Out Checklists
              </h3>
              <p className="text-muted-foreground mb-4">
                Standardized checklists for property condition assessment during
                move-in and move-out.
              </p>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-canvas rounded-md">
                  <div>
                    <div className="font-medium">
                      Move-In Inspection Checklist
                    </div>
                    <div className="text-xs text-ink-3">
                      For documenting property condition at tenant move-in
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>

                <div className="flex justify-between items-center p-3 bg-canvas rounded-md">
                  <div>
                    <div className="font-medium">
                      Move-Out Inspection Checklist
                    </div>
                    <div className="text-xs text-ink-3">
                      For documenting property condition at tenant move-out
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>

                <div className="flex justify-between items-center p-3 bg-canvas rounded-md">
                  <div>
                    <div className="font-medium">Damage Assessment Form</div>
                    <div className="text-xs text-ink-3">
                      For calculating deposit deductions
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
