'use client';

import { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Store, Package, BarChart3, Settings, LogOut } from 'lucide-react';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Marketplace Entegrasyon Paneli
            </h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              <LogOut size={20} />
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Marketplace Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <MarketplaceCard name="n11" color="bg-n11" />
          <MarketplaceCard name="Trendyol" color="bg-trendyol" />
          <MarketplaceCard name="Hepsiburada" color="bg-hepsiburada" />
          <MarketplaceCard name="Pazarama" color="bg-pazarama" />
          <MarketplaceCard name="İdefix" color="bg-idefix" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickAction
            icon={<Store />}
            title="Mağazalar"
            description="Pazaryeri bağlantılarını yönet"
            href="/stores"
          />
          <QuickAction
            icon={<Package />}
            title="Ürünler"
            description="Ürün kataloğunu yönet"
            href="/products"
          />
          <QuickAction
            icon={<BarChart3 />}
            title="Siparişler"
            description="Sipariş ve kargo takibi"
            href="/orders"
          />
          <QuickAction
            icon={<Settings />}
            title="Ayarlar"
            description="Senkronizasyon ayarları"
            href="/settings"
          />
        </div>

        {/* Coming Soon */}
        <div className="mt-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">
            Hoş Geldiniz!
          </h2>
          <p className="text-lg">
            Pazaryeri entegrasyon platformunuz hazır.
            Mağazalarınızı ekleyerek başlayabilirsiniz.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">
              Mağaza Ekle
            </button>
            <button className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800">
              Dokümantasyon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketplaceCard({ name, color }: { name: string; color: string }) {
  return (
    <div className={`${color} text-white rounded-lg p-4 text-center shadow-lg`}>
      <div className="text-lg font-bold">{name}</div>
      <div className="text-sm opacity-90 mt-1">Bağlı Değil</div>
    </div>
  );
}

function QuickAction({ icon, title, description, href }: any) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="text-blue-600 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
