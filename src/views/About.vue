<template>
  <div>
    <!-- Hero -->
    <section class="bg-gray-50 py-16">
      <div class="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
        <div class="flex-1">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            About <span class="text-brand">Zay Shop</span>
          </h1>
          <p class="text-gray-600 leading-relaxed mb-4">
            We are a passionate team of fashion enthusiasts committed to bringing you the finest
            curated selection of clothing, footwear, and accessories. Founded in 2020, Zay Shop
            has grown into a destination for quality products at fair prices.
          </p>
          <p class="text-gray-600 leading-relaxed">
            Our mission is simple: make great style accessible to everyone, with a seamless
            shopping experience from browse to delivery.
          </p>
        </div>
        <div class="flex-1">
          <img
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop"
            alt="About Zay Shop"
            class="rounded-xl shadow-lg w-full"
          />
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="py-14 bg-brand text-white">
      <div class="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div v-for="stat in [
          { value: '50K+', label: 'Happy Customers' },
          { value: '1200+', label: 'Products' },
          { value: '98%', label: 'Satisfaction Rate' },
          { value: '24/7', label: 'Support' },
        ]" :key="stat.label">
          <p class="text-4xl font-bold">{{ stat.value }}</p>
          <p class="text-brand-200 mt-1">{{ stat.label }}</p>
        </div>
      </div>
    </section>

    <!-- Team -->
    <section class="max-w-7xl mx-auto px-4 py-14">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-bold text-gray-800">Meet the Team</h2>
        <p class="text-gray-500 mt-2">The people behind your favourite shop.</p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div
          v-for="member in [
            { name: 'Alex Carter', role: 'CEO & Founder', avatar: 'https://ui-avatars.com/api/?name=Alex+Carter&background=28a745&color=fff&size=120' },
            { name: 'Maria López', role: 'Head of Design', avatar: 'https://ui-avatars.com/api/?name=Maria+Lopez&background=6366f1&color=fff&size=120' },
            { name: 'James Wu', role: 'Tech Lead', avatar: 'https://ui-avatars.com/api/?name=James+Wu&background=0ea5e9&color=fff&size=120' },
            { name: 'Sara Ahmed', role: 'Customer Success', avatar: 'https://ui-avatars.com/api/?name=Sara+Ahmed&background=f59e0b&color=fff&size=120' },
          ]" :key="member.name"
          class="text-center"
        >
          <img :src="member.avatar" :alt="member.name" class="w-24 h-24 rounded-full mx-auto mb-3 shadow" />
          <p class="font-semibold text-gray-800">{{ member.name }}</p>
          <p class="text-sm text-gray-500">{{ member.role }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
