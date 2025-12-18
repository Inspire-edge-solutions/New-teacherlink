import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { MdLock, MdRocketLaunch, MdHowToReg, MdGroupAdd, MdRedeem } from 'react-icons/md'

const SubscriptionPlans = () => {
  const [activeTab, setActiveTab] = useState("job-seekers")

  const jobSeekersFeatures = [
    { icon: "🔍", name: "Job Search", basic: "✅ Free", standard: "✅ Free", premium: "✅ Free" },
    { icon: "💾", name: "Saving Jobs", basic: "✅ Free", standard: "✅ Free", premium: "✅ Free" },
    { icon: "💬", name: "Messages from/to Institution", basic: "Unlimited", standard: "Unlimited", premium: "Unlimited" },
    { icon: "🔔", name: "Favorite Notification", basic: "Not Available", standard: "Not Available", premium: "Available Per Notification (20 Coins)" },
    { icon: "📞", name: "Support", basic: "Yes", standard: "Yes", premium: "Priority Support" },
    { icon: "📝", name: "Applying Jobs", basic: "🪙 100 Coins / Job", standard: "🪙 100 Coins / Job", premium: "🪙 100 Coins / Job" },
    { icon: "👁️", name: "Job View", basic: "🪙 50 Coins / Job", standard: "🪙 50 Coins / Job", premium: "🪙 50 Coins / Job" }
  ]

  const jobProvidersFeatures = [
    { icon: "🔍", name: "Candidate Search", basic: "✅ Free", standard: "✅ Free", premium: "✅ Free" },
    { icon: "👀", name: "Candidate Views", basic: "✅ Free", standard: "✅ Free", premium: "✅ Free" },
    { icon: "📚", name: "Saved Candidates", basic: "✅ Free", standard: "✅ Free", premium: "✅ Free" },
    { icon: "⭐", name: "Marked as Favourite", basic: "✅ Free", standard: "✅ Free", premium: "✅ Free" },
    { icon: "💬", name: "Messages from/to Candidates", basic: "∞ Unlimited", standard: "∞ Unlimited", premium: "∞ Unlimited" },
    { icon: "🖨️", name: "Download & Print", basic: "✅ Free", standard: "✅ Free", premium: "✅ Free" },
    { icon: "📞", name: "Support", basic: "📧 Email & 📞 Phone", standard: "📧 Email & 📞 Phone", premium: "💎 Priority Support" },
    { icon: "📝", name: "Job Postings", basic: "✅ Free", standard: "✅ Free", premium: "✅ Free" },
    { icon: "📂", name: "Access to Candidate Details", basic: "🪙 50 Coins / Profile", standard: "🪙 50 Coins / Profile", premium: "🪙 50 Coins / Profile" },
    { icon: "🔔", name: "Favourite Notifications", basic: "❌ NA", standard: "❌ NA", premium: "🔔 Available Per Notification (20 Coins)" }
  ]

  const renderFeaturesTable = (features) => (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden lg:block space-y-4">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center">
            <div className="w-1/4 flex items-center space-x-2">
              <span className="text-lg">{feature.icon}</span>
              <span className="text-lg sm:text-base text-gray-800 font-medium tracking-tight">{feature.name}</span>
            </div>
            <div className="w-1/4 text-center">
              <span className="text-lg sm:text-base text-gray-800 tracking-tight">{feature.basic}</span>
            </div>
            <div className="w-1/4 text-center">
              <span className="text-lg sm:text-base text-gray-800 tracking-tight">{feature.standard}</span>
            </div>
            <div className="w-1/4 text-center">
              <span className="text-lg sm:text-base text-gray-800 tracking-tight">{feature.premium}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile/Tablet View */}
      <div className="lg:hidden">
        {/* Plan Headers - Mobile */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gray-200 rounded-lg p-2.5 text-center">
            <div className="text-base font-semibold text-gray-800 tracking-tight">Basic</div>
          </div>
          <div className="rounded-lg p-2.5 text-center" style={{ backgroundColor: '#F0D8D9' }}>
            <div className="text-base font-semibold text-gray-800 tracking-tight">Standard</div>
          </div>
          <div className="bg-gray-200 rounded-lg p-2.5 text-center">
            <div className="text-base font-semibold text-gray-800 tracking-tight">Premium</div>
          </div>
        </div>
        
        {/* Features */}
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3 sm:p-4">
              {/* Feature Name Row */}
              <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-gray-200">
                <span className="text-lg sm:text-xl">{feature.icon}</span>
                <span className="text-base sm:text-lg text-gray-800 font-semibold tracking-tight break-words">{feature.name}</span>
              </div>
              
              {/* Features Row - Just the content */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-lg sm:text-base text-gray-800 break-words leading-normal tracking-tight">{feature.basic}</div>
                </div>
                <div className="text-center rounded-lg p-2" style={{ backgroundColor: '#F0D8D9' }}>
                  <div className="text-lg sm:text-base text-gray-800 break-words leading-normal tracking-tight">{feature.standard}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-base text-gray-800 break-words leading-normal tracking-tight">{feature.premium}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderPricingRow = (isJobSeekers) => {
    const pricing = isJobSeekers ? [
      { coins: "2000", original: "₹2000", discounted: "₹1500" },
      { coins: "4000", original: "₹4000", discounted: "₹3000" },
      { coins: "6000", original: "₹6000", discounted: "₹4500" }
    ] : [
      { coins: "4000", original: "₹4000", discounted: "₹3000" },
      { coins: "8000", original: "₹8000", discounted: "₹6000" },
      { coins: "12000", original: "₹12000", discounted: "₹9000" }
    ]

    return (
      <>
        {/* Desktop Pricing View */}
        <div className="hidden lg:flex items-center">
          <div className="w-1/4 flex items-center space-x-2">
            <span className="text-yellow-500 text-lg">🪙</span>
            <span className="text-lg sm:text-base text-gray-800 font-medium tracking-tight">Annual Subscription Plan</span>
          </div>
          <div className="w-1/4 text-center">
            <div className="text-gray-800 tracking-tight">
              <p className="text-lg sm:text-base">Get {pricing[0].coins} coins for</p>
              <p className="line-through text-lg sm:text-base">{pricing[0].original}</p>
              <p className="text-lg sm:text-base font-bold">{pricing[0].discounted}</p>
            </div>
          </div>
          <div className="w-1/4 text-center">
            <div className="text-gray-800 tracking-tight">
              <p className="text-lg sm:text-base">Get {pricing[1].coins} coins for</p>
              <p className="line-through text-lg sm:text-base">{pricing[1].original}</p>
              <p className="text-lg sm:text-base font-bold">{pricing[1].discounted}</p>
            </div>
          </div>
          <div className="w-1/4 text-center">
            <div className="text-gray-800 tracking-tight">
              <p className="text-lg sm:text-base">Get {pricing[2].coins} coins for</p>
              <p className="line-through text-lg sm:text-base">{pricing[2].original}</p>
              <p className="text-lg sm:text-base font-bold">{pricing[2].discounted}</p>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Pricing View */}
        <div className="lg:hidden bg-gray-50 rounded-lg p-4 sm:p-5">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-5">
            <span className="text-yellow-500 text-xl sm:text-2xl">🪙</span>
            <span className="text-base sm:text-lg text-gray-800 font-medium tracking-tight">Annual Subscription Plan</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {pricing.map((price, index) => {
              const planNames = ['Basic', 'Standard', 'Premium'];
              const isStandard = index === 1;
              
              return (
                <div key={index} className={`rounded-lg p-4 sm:p-5 text-center border border-gray-200 ${isStandard ? '' : 'bg-white'}`} style={isStandard ? { backgroundColor: '#F0D8D9' } : {}}>
                  <div className={`rounded-lg p-2 sm:p-2.5 mb-3 sm:mb-4 ${isStandard ? '' : 'bg-gray-200'}`} style={isStandard ? { backgroundColor: '#F0D8D9' } : {}}>
                    <div className="text-base font-semibold text-gray-800">{planNames[index]}</div>
                  </div>
                  <div className="text-gray-800">
                    <p className="text-base sm:text-lg mb-1.5 font-medium">Get {price.coins} coins for</p>
                    <p className="line-through text-base sm:text-lg text-gray-500">{price.original}</p>
                    <p className="font-bold text-lg sm:text-xl text-red-600 mt-1.5">{price.discounted}</p>
                    <div className="mt-2.5 text-base sm:text-lg text-green-600 font-medium">
                      Save ₹{parseInt(price.original.replace('₹', '')) - parseInt(price.discounted.replace('₹', ''))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen py-2 px-1">
      <div className="max-w-6xl mx-auto">
        {/* Main Container */}
        <div className="rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: '#F0D8D9' }}>
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Tab Selection */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="bg-white rounded-full p-1 shadow-md w-full max-w-md">
                <button
                  onClick={() => setActiveTab("job-seekers")}
                  className={`w-1/2 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-medium transition-colors text-sm sm:text-base ${
                    activeTab === "job-seekers"
                      ? "bg-gradient-brand text-white"
                      : "text-red-600 hover:bg-red-50"
                  }`}
                >
                  Job Seekers
                </button>
                <button
                  onClick={() => setActiveTab("job-providers")}
                  className={`w-1/2 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-medium transition-colors text-sm sm:text-base ${
                    activeTab === "job-providers"
                      ? "bg-gradient-brand text-white"
                      : "text-red-600 hover:bg-red-50"
                  }`}
                >
                  Job Provider
                </button>
              </div>
            </div>

            {/* Plan Headers - Desktop Only */}
            <div className="hidden lg:grid grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-4 leading-tight tracking-tight">Features</h3>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-4 leading-tight tracking-tight">Basic Subscription</h3>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-4 leading-tight tracking-tight">Standard Subscription</h3>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800 mb-4 leading-tight tracking-tight">Premium Subscription</h3>
              </div>
            </div>

            {/* Features Table */}
            <div className="bg-white rounded-lg p-4 sm:p-6 mb-6">
              {renderFeaturesTable(activeTab === "job-seekers" ? jobSeekersFeatures : jobProvidersFeatures)}
            </div>

            {/* Special Offers - Job Seekers only, before Pricing */}
            {activeTab === 'job-seekers' && (
              <div className="mb-6">
                <div className="w-full rounded-t-lg px-4 sm:px-6 py-3 text-white font-bold text-center bg-gradient-brand">
                  <span className="mr-2">🔔</span> SPECIAL OFFERS:
                </div>
                <div className="bg-white border border-gray-300 rounded-b-lg divide-y">
                  <div className="flex flex-col sm:flex-row items-center justify-center p-4 sm:p-5 text-center">
                    <div className="text-orange-500 mb-2 sm:mb-0 sm:mr-4"><MdLock size={24} className="sm:w-[26px] sm:h-[26px] mx-auto" /></div>
                    <div>
                      <div className="text-base sm:text-lg text-gray-800 font-semibold tracking-tight mb-1.5 sm:mb-0">Unlock more with Premium</div>
                      <div className="text-base sm:text-base text-gray-700 leading-normal tracking-tight">More coins, better support, and exclusive features!</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center p-4 sm:p-5 text-center">
                    <div className="text-blue-600 mb-2 sm:mb-0 sm:mr-4"><MdRocketLaunch size={24} className="sm:w-[26px] sm:h-[26px] mx-auto" /></div>
                    <div>
                      <div className="text-base sm:text-lg text-gray-800 font-semibold tracking-tight mb-1.5 sm:mb-0">Build your dream career faster</div>
                      <div className="text-base sm:text-base text-gray-700 leading-normal tracking-tight">With Standard & Premium perks.</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center p-4 sm:p-5 text-center">
                    <div className="text-emerald-600 mb-2 sm:mb-0 sm:mr-4"><MdHowToReg size={24} className="sm:w-[26px] sm:h-[26px] mx-auto" /></div>
                    <div>
                      <div className="text-base sm:text-lg text-gray-800 font-semibold tracking-tight mb-1.5 sm:mb-0">Join now & start applying today!</div>
                      <div className="text-base sm:text-base text-gray-700 leading-normal tracking-tight">Get started with your subscription plan</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center p-4 sm:p-5 text-center">
                    <div className="text-pink-600 mb-2 sm:mb-0 sm:mr-4"><MdGroupAdd size={24} className="sm:w-[26px] sm:h-[26px] mx-auto" /></div>
                    <div>
                      <div className="text-base sm:text-lg text-gray-800 font-semibold tracking-tight mb-1.5 sm:mb-0">Refer & Earn</div>
                      <div className="text-base sm:text-base text-gray-700 leading-normal tracking-tight">
                        <span className="mr-1"><span className="font-bold">✨ </span> Refer 20 candidates </span> → <span className="inline-flex items-center font-semibold ml-1 mr-1">when 10 get Registered</span> →<span className="ml-1">🪙 Earn 2000 Bonus Coins!</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center p-4 sm:p-5 text-center">
                    <div className="text-red-600 mb-2 sm:mb-0 sm:mr-4"><MdRedeem size={24} className="sm:w-[26px] sm:h-[26px] mx-auto" /></div>
                    <div>
                      <div className="text-base sm:text-lg text-gray-800 font-semibold tracking-tight mb-1.5 sm:mb-0">Coupon Redemption</div>
                      <div className="text-base sm:text-base text-gray-700 leading-normal tracking-tight"><span className="mr-1">✨</span> Got a promo code? Redeem it now for instant bonus <span className="ml-1">🪙</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Special Offers - Job Providers only, before Pricing */}
            {activeTab === 'job-providers' && (
              <div className="mb-6">
                <div className="w-full rounded-t-lg px-4 sm:px-6 py-3 text-white font-bold text-center bg-gradient-brand">
                  <span className="mr-2">🔔</span> SPECIAL OFFERS:
                </div>
                <div className="bg-white border border-gray-300 rounded-b-lg divide-y">
                  <div className="flex flex-col sm:flex-row items-center justify-center p-4 sm:p-5 text-center">
                    <div className="text-pink-600 mb-2 sm:mb-0 sm:mr-4"><MdGroupAdd size={24} className="sm:w-[26px] sm:h-[26px] mx-auto" /></div>
                    <div>
                      <div className="text-base sm:text-lg text-gray-800 font-semibold mb-1.5 sm:mb-0">Refer & Earn</div>
                      <div className="text-base sm:text-base text-gray-700 leading-normal tracking-tight">
                        <span className="mr-1">✨ Refer 10 institutions</span> → <span className="inline-flex items-center font-semibold ml-1 mr-1">When 5 get registered</span> → <span className="ml-1">🪙 Earn 4000 Bonus Coins!</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center p-4 sm:p-5 text-center">
                    <div className="text-red-600 mb-2 sm:mb-0 sm:mr-4"><MdRedeem size={24} className="sm:w-[26px] sm:h-[26px] mx-auto" /></div>
                    <div>
                      <div className="text-base sm:text-lg text-gray-800 font-semibold mb-1.5 sm:mb-0">Redeem Offer Coupon</div>
                      <div className="text-base sm:text-base text-gray-700 leading-normal tracking-tight"><span className="mr-1">✨</span> Got a code? Redeem now to earn extra <span className="ml-1">🪙</span> Coins!</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Header */}
            <div className="bg-gradient-brand text-white py-3 px-4 sm:px-6 rounded-t-lg mb-0">
              <h3 className="text-base sm:text-lg font-bold text-center">
                Pricing & Coin Benefits - {activeTab === "job-seekers" ? "Job Seekers" : "Job Providers"} Plans
              </h3>
            </div>

            {/* Pricing Table */}
            <div className="bg-white border border-gray-300 border-t-0 rounded-b-lg p-4 sm:p-6">
              {renderPricingRow(activeTab === "job-seekers")}
            </div>

            {/* Register/Login Text */}
            <div className="mt-4 sm:mt-6 text-center">
              <p className="text-sm sm:text-base lg:text-lg text-gray-800">
                <span className="text-red-600 font-bold mr-1">*</span>
                <Link 
                  to={activeTab === "job-seekers" ? "/register?role=job-seeker" : "/register?role=job-provider"}
                  className="text-red-600 hover:text-red-700 font-semibold"
                >
                  Register/Login
                </Link>
                {' '}to subscribe to any plan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionPlans