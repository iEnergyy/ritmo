'use client';

import { useSession } from '@/lib/auth-client';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [organizationTypes, setOrganizationTypes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user && !isPending) {
      loadOrganizations();
    }
  }, [session, isPending]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const result = await authClient.organization.list();
      if (result.data) {
        setOrganizations(result.data);
        
        // Load organization types
        const orgIds = result.data.map((org: any) => org.id).join(',');
        if (orgIds) {
          const typesResponse = await fetch(`/api/organizations/metadata?ids=${orgIds}`);
          if (typesResponse.ok) {
            const typesData = await typesResponse.json();
            setOrganizationTypes(typesData.types || {});
          }
        }
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Not authenticated</h1>
          <Link
            href="/signin"
            className="text-blue-600 hover:text-blue-500 underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const activeOrg = session.session?.activeOrganizationId
    ? organizations.find((org) => org.id === session.session.activeOrganizationId)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </Link>
              <button
                onClick={handleSignOut}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">User Information</h2>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">User ID:</span>{' '}
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {session.user.id}
                </code>
              </div>
              <div>
                <span className="font-semibold">Name:</span> {session.user.name || 'N/A'}
              </div>
              <div>
                <span className="font-semibold">Email:</span> {session.user.email}
              </div>
              <div>
                <span className="font-semibold">Email Verified:</span>{' '}
                {session.user.emailVerified ? 'Yes' : 'No'}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Session Information</h2>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Session ID:</span>{' '}
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {session.session?.id || 'N/A'}
                </code>
              </div>
              <div>
                <span className="font-semibold">Active Organization ID:</span>{' '}
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {session.session?.activeOrganizationId || 'None'}
                </code>
              </div>
              <div>
                <span className="font-semibold">Expires At:</span>{' '}
                {session.session?.expiresAt
                  ? new Date(session.session.expiresAt).toLocaleString()
                  : 'N/A'}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Organizations</h2>
              <Link
                href="/organizations/create"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Create Organization
              </Link>
            </div>
            {loading ? (
              <div>Loading organizations...</div>
            ) : organizations.length === 0 ? (
              <div className="text-gray-500">
                No organizations found. Create one to test multi-tenancy.
              </div>
            ) : (
              <div className="space-y-4">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className={`border rounded-lg p-4 ${
                      activeOrg?.id === org.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{org.name}</h3>
                        <p className="text-sm text-gray-600">
                          Slug: <code className="bg-gray-100 px-1 rounded">{org.slug}</code>
                        </p>
                        {organizationTypes[org.id] && (
                          <p className="text-sm text-gray-600">
                            Type:{' '}
                            <span className="font-medium capitalize">
                              {organizationTypes[org.id].replace('_', ' ')}
                            </span>
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          ID: <code className="bg-gray-100 px-1 rounded text-xs">{org.id}</code>
                        </p>
                        {activeOrg?.id === org.id && (
                          <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            Active Organization
                          </span>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          await authClient.organization.setActive({
                            organizationId: org.id,
                          });
                          window.location.reload();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        disabled={activeOrg?.id === org.id}
                      >
                        {activeOrg?.id === org.id ? 'Active' : 'Set Active'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Raw Session Data</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}

