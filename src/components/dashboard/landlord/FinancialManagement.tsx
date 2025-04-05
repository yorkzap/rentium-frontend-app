"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Download, ArrowUpRight, ArrowDownRight, Receipt, Plus, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function FinancialManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Mock data for financial transactions
  const transactions = [
    {
      id: 1,
      date: "Apr 1, 2023",
      description: "Rent Payment - 123 Main St, Apt 4B",
      tenant: "John Tenant",
      amount: "$1,800",
      type: "Income",
      category: "Rent",
      status: "Completed",
    },
    {
      id: 2,
      date: "Apr 1, 2023",
      description: "Rent Payment - 456 Park Ave",
      tenant: "Sarah Renter",
      amount: "$2,200",
      type: "Income",
      category: "Rent",
      status: "Completed",
    },
    {
      id: 3,
      date: "Apr 3, 2023",
      description: "Plumbing Repair - 456 Park Ave",
      tenant: "N/A",
      amount: "$350",
      type: "Expense",
      category: "Maintenance",
      status: "Completed",
    },
    {
      id: 4,
      date: "Apr 5, 2023",
      description: "Security Deposit - 789 Oak Rd",
      tenant: "James Wilson",
      amount: "$1,600",
      type: "Income",
      category: "Deposit",
      status: "Pending",
    },
    {
      id: 5,
      date: "Apr 10, 2023",
      description: "Property Insurance Payment",
      tenant: "N/A",
      amount: "$450",
      type: "Expense",
      category: "Insurance",
      status: "Scheduled",
    },
  ]

  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === "Income" && t.status === "Completed")
    .reduce((sum, t) => sum + Number.parseFloat(t.amount.replace("$", "").replace(",", "")), 0)

  const totalExpenses = transactions
    .filter((t) => t.type === "Expense" && t.status === "Completed")
    .reduce((sum, t) => sum + Number.parseFloat(t.amount.replace("$", "").replace(",", "")), 0)

  const netIncome = totalIncome - totalExpenses

  // Filter transactions based on search term and type
  const filteredTransactions = transactions.filter(
    (transaction) =>
      (transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (typeFilter === "all" || transaction.type === typeFilter),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Financial</h1>
          <p className="text-slate-500 text-sm mt-1">Track income, expenses, and financial performance</p>
        </div>
        <div className="flex space-x-2 w-full md:w-auto">
          <Button variant="outline" className="whitespace-nowrap">
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button className="bg-slate-900 hover:bg-slate-800 whitespace-nowrap">
            <Plus className="h-4 w-4 mr-1" /> Record Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Monthly Income</p>
                <p className="text-2xl font-semibold">${totalIncome.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-full bg-green-50 text-green-600">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Monthly Expenses</p>
                <p className="text-2xl font-semibold">${totalExpenses.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-full bg-red-50 text-red-600">
                <ArrowDownRight className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Net Income</p>
                <p className="text-2xl font-semibold">${netIncome.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Tabs defaultValue="all" className="w-full" onValueChange={setTypeFilter}>
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="all">All Transactions</TabsTrigger>
            <TabsTrigger value="Income">Income</TabsTrigger>
            <TabsTrigger value="Expense">Expenses</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search transactions..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-1" /> Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Filter by Category</DropdownMenuItem>
                <DropdownMenuItem>Filter by Date</DropdownMenuItem>
                <DropdownMenuItem>Filter by Status</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th scope="col" className="relative px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{transaction.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {transaction.description}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                        transaction.type === "Income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {transaction.type === "Income" ? "+" : "-"}
                      {transaction.amount}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          transaction.type === "Income" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {transaction.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          transaction.status === "Completed"
                            ? "bg-green-50 text-green-700"
                            : transaction.status === "Pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm">
                        <Receipt className="h-4 w-4 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="p-6 text-center">
              <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-700">No transactions found</h3>
              <p className="text-sm text-slate-500 mt-1">
                {searchTerm || typeFilter !== "all"
                  ? "No transactions match your current filters"
                  : "You don't have any transactions yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Income Breakdown</CardTitle>
              <CardDescription>Monthly income by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Rent Income</h4>
                    <span className="text-green-600 font-medium">$4,000</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: "80%" }}></div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">80% of total income</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Security Deposits</h4>
                    <span className="text-green-600 font-medium">$1,000</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: "20%" }}></div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">20% of total income</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Monthly expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Maintenance</h4>
                    <span className="text-red-600 font-medium">$350</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: "44%" }}></div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">44% of total expenses</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Insurance</h4>
                    <span className="text-red-600 font-medium">$450</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: "56%" }}></div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">56% of total expenses</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

