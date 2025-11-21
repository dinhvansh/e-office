'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';

interface Field {
  id: number;
  type: 'signature' | 'text' | 'date' | 'checkbox';
  label?: string;
  placeholder?: string;
  required: boolean;
  value: any;
  filled_at: string | null;
}

export default function PublicSignPage() {
  const params = useParams();
  const token = params.token as string;
  const [fieldValues, setFieldValues] = useState<Record<number, any>>({});
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');

  // Fetch signing page data
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-sign', token],
    queryFn: async () => {
      const response = await fetch(`http://localhost:4000/public/sign/${token}`);
      if (!response.ok) {
        throw new Error('Invalid signing link');
      }
      const result = await response.json();
      return result.data;
    },
    retry: false,
  });

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`http://localhost:4000/public/sign/${token}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send OTP');
      }
      return response.json();
    },
    onSuccess: () => {
      setOtpSent(true);
      toast.success('OTP sent to your email');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send OTP');
    },
  });

  // Submit signature mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`http://localhost:4000/public/sign/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp,
          field_values: Object.entries(fieldValues).map(([field_id, value]) => ({
            field_id: parseInt(field_id),
            value,
          })),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit signature');
      }
      return response.json();
    },
    onSuccess: (result) => {
      toast.success('Document signed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit signature');
    },
  });

  const handleFieldChange = (fieldId: number, value: any) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSendOtp = () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    sendOtpMutation.mutate();
  };

  const handleSubmit = () => {
    // Validate required fields
    const requiredFields = data?.fields?.filter((f: Field) => f.required) || [];
    const missingFields = requiredFields.filter((f: Field) => !fieldValues[f.id]);
    
    if (missingFields.length > 0) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!otp || otp.length !== 6) {
      toast.error('Please enter valid 6-digit OTP');
      return;
    }

    submitMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium">Invalid or expired signing link</p>
          <p className="text-sm text-red-500 mt-2">Please contact the document sender</p>
        </div>
      </div>
    );
  }

  if (data?.already_signed) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">Already Signed</h2>
          <p className="text-green-700">You have already signed this document</p>
          <p className="text-sm text-green-600 mt-2">
            Signed on: {new Date(data.signed_at).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  if (submitMutation.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">Successfully Signed!</h2>
          <p className="text-green-700">Thank you for signing the document</p>
          {submitMutation.data?.data?.all_signed && (
            <p className="text-sm text-green-600 mt-2">
              All signers have completed. The document is now finalized.
            </p>
          )}
        </div>
      </div>
    );
  }

  const signer = data?.signer;
  const signRequest = data?.sign_request;
  const document = data?.document;
  const fields: Field[] = data?.fields || [];

  if (!email) {
    setEmail(signer?.email || '');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="border-b pb-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {signRequest?.title || 'Document Signing Request'}
          </h1>
          <p className="text-gray-600">{signRequest?.message}</p>
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <span>Document: {document?.title || document?.original_file_name}</span>
            <span>•</span>
            <span>Signer: {signer?.name}</span>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900">Fields to Complete</h2>
          {fields.length === 0 ? (
            <p className="text-gray-500">No fields to fill</p>
          ) : (
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.id} className="border rounded-lg p-4">
                  <Label className="text-sm font-medium">
                    {field.label || `${field.type} field`}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  
                  {field.type === 'text' && (
                    <Input
                      type="text"
                      placeholder={field.placeholder || 'Enter text'}
                      value={fieldValues[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="mt-2"
                    />
                  )}
                  
                  {field.type === 'date' && (
                    <Input
                      type="date"
                      value={fieldValues[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="mt-2"
                    />
                  )}
                  
                  {field.type === 'checkbox' && (
                    <div className="mt-2">
                      <input
                        type="checkbox"
                        checked={fieldValues[field.id] || false}
                        onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm">I agree</span>
                    </div>
                  )}
                  
                  {field.type === 'signature' && (
                    <div className="mt-2">
                      <Input
                        type="text"
                        placeholder="Type your full name as signature"
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Full signature canvas will be implemented in next iteration
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OTP Section */}
        <div className="border-t pt-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Verification</h2>
          
          <div>
            <Label>Email</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={otpSent}
              />
              <Button
                onClick={handleSendOtp}
                disabled={sendOtpMutation.isPending || otpSent}
              >
                {otpSent ? 'OTP Sent' : 'Send OTP'}
              </Button>
            </div>
          </div>

          {otpSent && (
            <div>
              <Label>OTP Code</Label>
              <Input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit OTP"
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Check your email for the OTP code
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="mt-8">
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || !otpSent}
            className="w-full"
            size="lg"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Sign Document'}
          </Button>
        </div>
      </div>
    </div>
  );
}
