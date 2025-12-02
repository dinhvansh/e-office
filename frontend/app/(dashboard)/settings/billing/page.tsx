'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, Zap, Cloud, Smartphone, HeadphonesIcon, TrendingUp, Shield, X } from 'lucide-react';

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const currentPlan = {
    name: 'On-Premise Enterprise',
    type: 'on-premise',
    status: 'active',
    users: 50,
    storage: 'Unlimited',
    features: [
      'Tự quản lý server',
      'Toàn quyền kiểm soát dữ liệu',
      'Tùy chỉnh không giới hạn',
      'Không phụ thuộc internet',
    ],
  };

  const saasPlans = [
    {
      name: 'SaaS Starter',
      price: { monthly: 990000, yearly: 9900000 },
      users: '10 users',
      storage: '100 GB',
      popular: false,
      features: [
        'Tự động cập nhật',
        'Cloud storage an toàn',
        'Mobile app (iOS & Android)',
        'Email support',
        'Backup tự động hàng ngày',
        'SSL/TLS encryption',
      ],
    },
    {
      name: 'SaaS Professional',
      price: { monthly: 2990000, yearly: 29900000 },
      users: '50 users',
      storage: '500 GB',
      popular: true,
      features: [
        'Tất cả tính năng Starter',
        'Priority support 24/7',
        'Advanced analytics',
        'API access',
        'Custom workflows',
        'SSO integration',
        'Audit logs',
      ],
    },
    {
      name: 'SaaS Enterprise',
      price: { monthly: 9990000, yearly: 99900000 },
      users: 'Unlimited',
      storage: 'Unlimited',
      popular: false,
      features: [
        'Tất cả tính năng Professional',
        'Dedicated account manager',
        'Custom integrations',
        'SLA 99.9% uptime',
        'Advanced security',
        'Training & onboarding',
        'White-label options',
      ],
    },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={CreditCard}
        title="Gói dịch vụ & Thanh toán"
        description="Quản lý gói dịch vụ và nâng cấp lên E-Office Cloud"
        iconColor="text-emerald-600"
      />

      {/* Current Plan */}
      <Card className="border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Gói hiện tại</CardTitle>
              <CardDescription>Bạn đang sử dụng phiên bản On-Premise</CardDescription>
            </div>
            <Badge className="bg-emerald-500 text-white text-lg px-4 py-2">
              {currentPlan.status === 'active' ? 'Đang hoạt động' : 'Hết hạn'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500">Gói dịch vụ</div>
              <div className="text-xl font-bold text-emerald-600">{currentPlan.name}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500">Số người dùng</div>
              <div className="text-xl font-bold">{currentPlan.users} users</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500">Dung lượng</div>
              <div className="text-xl font-bold">{currentPlan.storage}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <div className="font-medium mb-3">Tính năng hiện tại:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Banner */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">🚀 Nâng cấp lên E-Office Cloud</h3>
              <p className="text-blue-100 mb-4">
                Trải nghiệm tính năng vượt trội với cloud platform. Không cần quản lý server, tự động cập nhật, truy cập mọi lúc mọi nơi!
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  <span className="text-sm">Cloud Storage</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  <span className="text-sm">Mobile App</span>
                </div>
                <div className="flex items-center gap-2">
                  <HeadphonesIcon className="w-5 h-5" />
                  <span className="text-sm">24/7 Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  <span className="text-sm">Auto Updates</span>
                </div>
              </div>
            </div>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8">
              Tìm hiểu thêm
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Thanh toán hàng tháng
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Thanh toán hàng năm
            <Badge className="ml-2 bg-green-500 text-white">Tiết kiệm 17%</Badge>
          </button>
        </div>
      </div>

      {/* SaaS Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {saasPlans.map((plan, index) => (
          <Card
            key={index}
            className={`relative ${
              plan.popular
                ? 'border-2 border-blue-500 shadow-xl scale-105'
                : 'border hover:border-gray-300'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-500 text-white px-4 py-1">Phổ biến nhất</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="mt-4">
                <div className="text-4xl font-bold text-blue-600">
                  {formatPrice(plan.price[billingCycle])}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  /{billingCycle === 'monthly' ? 'tháng' : 'năm'}
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {plan.users} • {plan.storage}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className={`w-full ${
                  plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                Chọn gói này
              </Button>
              <div className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>So sánh On-Premise vs SaaS Cloud</CardTitle>
          <CardDescription>Xem chi tiết sự khác biệt giữa hai phiên bản</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Tính năng</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">On-Premise</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">SaaS Cloud</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { feature: 'Quản lý tài liệu', onprem: true, saas: true },
                  { feature: 'Workflow & Approval', onprem: true, saas: true },
                  { feature: 'Chữ ký điện tử', onprem: true, saas: true },
                  { feature: 'Mobile App', onprem: false, saas: true },
                  { feature: 'Tự động cập nhật', onprem: false, saas: true },
                  { feature: 'Cloud Storage', onprem: false, saas: true },
                  { feature: 'Backup tự động', onprem: false, saas: true },
                  { feature: '24/7 Support', onprem: false, saas: true },
                  { feature: 'Không cần quản lý server', onprem: false, saas: true },
                  { feature: 'Toàn quyền kiểm soát dữ liệu', onprem: true, saas: false },
                  { feature: 'Tùy chỉnh source code', onprem: true, saas: false },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{row.feature}</td>
                    <td className="px-4 py-3 text-center">
                      {row.onprem ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.saas ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Contact CTA */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-0">
        <CardContent className="p-8 text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-blue-400" />
          <h3 className="text-2xl font-bold mb-2">Cần tư vấn thêm?</h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Đội ngũ chuyên gia của chúng tôi sẵn sàng tư vấn giải pháp phù hợp nhất cho doanh nghiệp của bạn
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Liên hệ tư vấn
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
              Đặt lịch demo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
