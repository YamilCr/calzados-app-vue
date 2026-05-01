<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-20">
    <p class="text-9xl font-black text-gray-200 select-none">404</p>
    <h1 class="text-2xl font-bold text-gray-800 -mt-4 mb-3">Page Not Found</h1>
    <p class="text-gray-500 max-w-sm mb-8">
      The page you're looking for doesn't exist or has been moved.
    </p>
    <div class="flex gap-3">
      <router-link to="/" class="btn-primary">
        <i class="fa fa-home mr-2" /> Home
      </router-link>
      <router-link to="/shop" class="btn-outline">
        Browse Shop
      </router-link>
    </div>
  </div>
</template>
