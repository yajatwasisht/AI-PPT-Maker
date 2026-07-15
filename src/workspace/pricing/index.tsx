import React from 'react'
import { PricingTable } from '@clerk/react'

function Pricing() {
  return (
        <div className=' flex flex-col items-center justify-center min-h-[80vh]'>
            <div className='text-center mt-25 max-w-4xl w-full px-4'>
                <h2 className='text-3xl font-bold mb-2'>Pricing</h2>
                <p className='text-lg text-gray-500 mb-8'>Start Creating Unlimited Slides</p>
                <div className='flex justify-center [color-scheme:light]'>
                  <PricingTable
                    appearance={{
                      variables: {
                        colorBackground: '#ffffff',
                        colorForeground: '#111827',
                        colorMutedForeground: '#6b7280',
                        colorMuted: '#f3f4f6',
                        colorInput: '#ffffff',
                        colorInputForeground: '#111827',
                        colorNeutral: '#e5e7eb',
                      },
                    }}
                  />
                </div>
            </div>
        </div>
    )
}

export default Pricing