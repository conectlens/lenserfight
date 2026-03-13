import React from 'react'

import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { TagBadge } from '../../../components/TagBadge'

export const AdminDesign: React.FC = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold mb-6">Design System & Brand</h1>

      <section>
        <h2 className="text-xl font-bold mb-4">Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-primary text-gray-900 font-bold">Primary</div>
          <div className="p-4 rounded-lg bg-gray-900 text-white">Gray 900</div>
          <div className="p-4 rounded-lg bg-gray-500 text-white">Gray 500</div>
          <div className="p-4 rounded-lg bg-red-500 text-white">Danger</div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Typography</h2>
        <Card className="p-6 space-y-4">
          <h1 className="text-4xl font-black">Heading 1 (Inter Black)</h1>
          <h2 className="text-3xl font-bold">Heading 2 (Inter Bold)</h2>
          <h3 className="text-2xl font-semibold">Heading 3 (Inter Semibold)</h3>
          <p className="text-base text-gray-600">
            Body text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <p className="text-sm text-gray-500">Small text / captions.</p>
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button className="w-auto">Primary Button</Button>
          <Button variant="secondary" className="w-auto">
            Secondary Button
          </Button>
          <Button variant="ghost" className="w-auto">
            Ghost Button
          </Button>
          <Button isLoading className="w-auto">
            Loading
          </Button>
          <Button disabled className="w-auto">
            Disabled
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Badges & Tags</h2>
        <div className="flex gap-2">
          <TagBadge label="Design" />
          <TagBadge label="Development" />
          <TagBadge label="AI" />
        </div>
      </section>
    </div>
  )
}
