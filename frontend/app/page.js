// 'use client';
// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';

// export default function Home() {
//   const router = useRouter();

//   useEffect(() => {
//     router.replace('/login');
//   }, [router]);

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
//       <div className="text-center">
//         <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
//         <p className="mt-4 text-blue-600 font-medium">Loading CareSight...</p>
//       </div>
//     </div>
//   );
// };

'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Shield, 
  Users, 
  Activity, 
  MessageSquare, 
  Stethoscope,
  ArrowRight,
  Check
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  const handleLoginClick = () => {
    router.push('/login');
  };

  const features = [
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Voice Communication",
      description: "Advanced voice recognition for patients with communication difficulties"
    },
    {
      icon: <Activity className="w-6 h-6" />,
      title: "Real-time Monitoring",
      description: "Continuous emotion detection and alert system for immediate care"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Care Coordination",
      description: "Seamless connection between patients, nurses, and administrators"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Private",
      description: "HIPAA-compliant security with role-based access control"
    }
  ];

  const benefits = [
    "Improve patient-caregiver communication",
    "Reduce response time to patient needs",
    "Streamline healthcare workflows",
    "Enhance patient satisfaction and safety"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 pt-6 pb-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                VoiceOut
              </h1>
            </div>
            <Button 
              onClick={handleLoginClick}
              variant="outline"
              className="hover:bg-blue-50 border-blue-200"
            >
              Login
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-200">
            Healthcare Communication Platform
          </Badge>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-green-600 bg-clip-text text-transparent leading-tight">
            Empowering Healthcare
            <br />
            <span className="text-4xl md:text-5xl">Communication</span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            VoiceOut bridges communication gaps in healthcare, enabling patients with communication 
            difficulties to connect seamlessly with their care team through innovative voice 
            recognition and real-time monitoring technology.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={handleLoginClick}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            
            <div className="flex items-center space-x-2 text-gray-600">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-sm">Trusted by healthcare professionals</span>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-blue-100">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-gray-800 mb-4">
              Why Choose VoiceOut?
            </h3>
            <p className="text-gray-600 text-lg">
              Designed specifically for healthcare environments with patient safety and communication at its core
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3 group">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 font-medium">{benefit}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-48 h-48 bg-gradient-to-r from-blue-400 to-green-400 rounded-full flex items-center justify-center shadow-2xl">
                  <Heart className="w-24 h-24 text-white animate-pulse" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-green-400 rounded-full animate-ping opacity-20"></div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-4">
            Ready to Transform Healthcare Communication?
          </h3>
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            Join healthcare professionals who are already using VoiceOut to improve patient care and communication efficiency.
          </p>
          
          <Button 
            onClick={handleLoginClick}
            size="lg"
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-12 py-4 text-xl font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
          >
            Access Your Dashboard
            <ArrowRight className="ml-3 w-6 h-6" />
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-blue-100 bg-white/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              VoiceOut
            </span>
          </div>
          <p className="text-gray-600">
            Empowering healthcare communication • Built with care for patients and providers
          </p>
        </div>
      </footer>
    </div>
  );
}