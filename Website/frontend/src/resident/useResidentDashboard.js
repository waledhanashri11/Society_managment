import { useEffect, useMemo, useState } from 'react';
import { Home, Users, Truck, AlertTriangle, CheckCircle2, Bell, Package, UserCheck } from 'lucide-react';
import api from '../services/api';

const fetchDashboard = () => api.get('/resident/dashboard');
const fetchMaintenance = () => api.get('/resident/maintenance');
const fetchComplaints = () => api.get('/resident/complaints');
const fetchVisitors = () => api.get('/resident/visitors');
const fetchParcels = () => api.get('/resident/parcels');
const fetchActivities = () => api.get('/resident/activities');
const fetchNotices = () => api.get('/notices/latest');

export const useResidentDashboard = () => {
  const [state, setState] = useState({
    loading: true,
    error: null,
    dashboard: null,
    maintenance: [],
    complaints: [],
    visitors: [],
    parcels: [],
    activities: [],
    notices: [],
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const [dashboardRes, maintenanceRes, complaintsRes, visitorsRes, parcelsRes, activitiesRes, noticesRes] = await Promise.all([
          fetchDashboard(),
          fetchMaintenance(),
          fetchComplaints(),
          fetchVisitors(),
          fetchParcels(),
          fetchActivities(),
          fetchNotices(),
        ]);

        if (!mounted) return;

        setState({
          loading: false,
          error: null,
          dashboard: dashboardRes.data,
          maintenance: maintenanceRes.data,
          complaints: complaintsRes.data,
          visitors: visitorsRes.data,
          parcels: parcelsRes.data,
          activities: activitiesRes.data,
          notices: noticesRes.data,
        });
      } catch (error) {
        if (!mounted) return;
        setState({
          loading: false,
          error: error.response?.data?.message || 'Unable to load dashboard data',
          dashboard: null,
          maintenance: [],
          complaints: [],
          visitors: [],
          parcels: [],
          activities: [],
          notices: [],
        });
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  const summaryCards = useMemo(() => {
    const summary = state.dashboard?.summary || {};
    return [
      { label: 'My Flat', value: state.dashboard?.user?.flat_no || 'N/A', icon: Home, accent: 'bg-sky-500' },
      { label: 'Family Members', value: summary.family_members ?? 0, icon: Users, accent: 'bg-sky-500' },
      { label: 'Registered Vehicles', value: summary.registered_vehicles ?? 0, icon: Truck, accent: 'bg-slate-500' },
      { label: 'Pending Maintenance', value: summary.pending_bills ?? 0, icon: AlertTriangle, accent: 'bg-amber-500' },
      { label: 'Paid Maintenance', value: summary.paid_bills ?? 0, icon: CheckCircle2, accent: 'bg-emerald-500' },
      { label: 'Pending Parcels', value: summary.pending_parcels ?? 0, icon: Package, accent: 'bg-indigo-500' },
      { label: "Today's Visitors", value: summary.today_visitors ?? 0, icon: UserCheck, accent: 'bg-sky-500' },
      { label: 'Active Notices', value: state.notices.length, icon: Bell, accent: 'bg-cyan-500' },
    ];
  }, [state.dashboard, state.notices.length]);

  return {
    ...state,
    summaryCards,
    reload: () => setReloadKey((value) => value + 1),
  };
};
