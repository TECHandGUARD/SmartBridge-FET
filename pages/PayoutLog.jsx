import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function PayoutLog() {
  const [payouts, setPayouts] = useState([]);
  const [filteredPayouts, setFilteredPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tutor_payouts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPayouts(data || []);
      calculateTotals(data || []);
      applyFilters(data || []);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (data) => {
    const paid = data
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    setTotalAmount(paid);
  };

  const applyFilters = (data) => {
    let filtered = data;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.tutor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.booking_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.tutor_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPayouts(filtered);
  };

  useEffect(() => {
    applyFilters(payouts);
  }, [searchTerm, statusFilter, payouts]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tutor Payout Log</h1>
          <p className="text-muted-foreground">Track all payments made to tutors</p>
        </div>

        {/* Stats Card */}
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-green-700" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-green-700">R{totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by tutor name, email, or booking ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payouts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payouts ({filteredPayouts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPayouts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No payouts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Booking Ref</th>
                      <th className="text-left py-3 px-4 font-semibold">Tutor Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Payout Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayouts.map((payout) => (
                      <tr key={payout.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-xs">{payout.booking_reference || '-'}</td>
                        <td className="py-3 px-4 font-medium">{payout.tutor_name}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{payout.tutor_email}</td>
                        <td className="py-3 px-4 font-semibold">R{(payout.amount || 0).toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(payout.status)}>
                            {payout.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {payout.payout_date
                            ? new Date(payout.payout_date).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                          {payout.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}