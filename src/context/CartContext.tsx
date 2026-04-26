import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../components/ProductCard';

// CartItem extends Product with additional cart-specific properties
export interface CartItem extends Product {
  quantity: number;
  selectedSize: string;
  message: string;
  selectedOptions?: Record<string, any>;
}

// Context type definition
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (
    product: Product,
    quantity: number,
    size: string,
    message: string,
    selectedOptions?: Record<string, any>
  ) => void;
  removeFromCart: (id: number | string, size: string) => void;
  updateQuantity: (id: number | string, size: string, delta: number) => void;
  updateCartItem: (
    productId: number | string,
    oldSize: string,
    newSize: string,
    newQuantity: number,
    newMessage: string,
    newPrice?: number,
    newSelectedOptions?: Record<string, any>
  ) => void;
  updateCartItemMessage: (productId: number | string, size: string, newMessage: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

// Create the context
const CartContext = createContext<CartContextType | undefined>(undefined);

// LocalStorage key
const CART_STORAGE_KEY = 'cart';

// Helper function to load cart from localStorage
const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
  }
  return [];
};

// Cart Provider Component
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state from localStorage using function initializer
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadCartFromStorage());

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems]);

  // Add item to cart
  const addToCart = (
    product: Product,
    quantity: number,
    size: string,
    message: string,
    selectedOptions?: Record<string, any>
  ) => {
    setCartItems((prevItems) => {
      // Check if item with same ID and size already exists
      const existingItemIndex = prevItems.findIndex(
        (item) => item.id === product.id && item.selectedSize === size
      );

      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
        };
        return updatedItems;
      } else {
        // Add new item
        const newItem: CartItem = {
          ...product,
          quantity,
          selectedSize: size,
          message,
          selectedOptions,
        };
        return [...prevItems, newItem];
      }
    });
  };

  // Remove item from cart
  const removeFromCart = (id: number | string, size: string) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => !(item.id === id && item.selectedSize === size))
    );
  };

  // Update quantity of an item
  const updateQuantity = (id: number | string, size: string, delta: number) => {
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id && item.selectedSize === size) {
          const newQuantity = item.quantity + delta;
          // Prevent quantity from going below 1
          return {
            ...item,
            quantity: newQuantity >= 1 ? newQuantity : 1,
          };
        }
        return item;
      })
    );
  };

  // Update cart item (edit size, quantity, message, price)
  const updateCartItem = (
    productId: number | string,
    oldSize: string,
    newSize: string,
    newQuantity: number,
    newMessage: string,
    newPrice?: number,
    newSelectedOptions?: Record<string, any>
  ) => {
    setCartItems((prevItems) => {
      // Step 1: Find the item being edited (match id AND oldSize)
      const itemIndex = prevItems.findIndex(
        (item) => item.id === productId && item.selectedSize === oldSize
      );

      if (itemIndex === -1) {
        // Item not found, return unchanged
        return prevItems;
      }

      const itemToEdit = prevItems[itemIndex];

      // Step 2: Check for conflict - does an item with id AND newSize already exist?
      // (exclude the one currently being edited)
      const conflictingItemIndex = prevItems.findIndex(
        (item, index) => index !== itemIndex && item.id === productId && item.selectedSize === newSize
      );

      if (conflictingItemIndex >= 0) {
        // Scenario A: Conflict Exists (Merge)
        // Remove the old item
        // Update the existing target item: Add newQuantity to its current quantity, update message
        const updatedItems = [...prevItems];
        const conflictingItem = updatedItems[conflictingItemIndex];
        
        // Remove the old item
        updatedItems.splice(itemIndex, 1);
        
        // Update the conflicting item (note: itemIndex might have changed after splice if itemIndex < conflictingItemIndex)
        const newConflictIndex = itemIndex < conflictingItemIndex ? conflictingItemIndex - 1 : conflictingItemIndex;
        updatedItems[newConflictIndex] = {
          ...conflictingItem,
          quantity: conflictingItem.quantity + newQuantity,
          message: newMessage,
          ...(newSelectedOptions && {
            selectedOptions: newSelectedOptions,
          }),
          // Update price if provided
          ...(newPrice !== undefined && {
            price: newPrice,
            sale_price: null, // Clear sale_price when using calculated price
          }),
        };

        return updatedItems;
      } else {
        // Scenario B: No Conflict (Simple Update)
        // Just update the fields (selectedSize, quantity, message, price) of the item found in step 1
        const updatedItems = [...prevItems];
        updatedItems[itemIndex] = {
          ...itemToEdit,
          selectedSize: newSize,
          quantity: newQuantity,
          message: newMessage,
          ...(newSelectedOptions && {
            selectedOptions: newSelectedOptions,
          }),
          // Update price if provided
          ...(newPrice !== undefined && {
            price: newPrice,
            sale_price: null, // Clear sale_price when using calculated price
          }),
        };

        return updatedItems;
      }
    });
  };

  // Update only the gift/card message for a specific cart line.
  const updateCartItemMessage = (productId: number | string, size: string, newMessage: string) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId && item.selectedSize === size
          ? { ...item, message: newMessage }
          : item
      )
    );
  };

  // Clear entire cart
  const clearCart = () => {
    setCartItems([]);
  };

  // Calculate total price
  const cartTotal = cartItems.reduce((total, item) => {
    const price = item.sale_price && item.sale_price < item.price ? item.sale_price : item.price;
    return total + price * item.quantity;
  }, 0);

  // Calculate total number of items
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const value: CartContextType = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateCartItem,
    updateCartItemMessage,
    clearCart,
    cartTotal,
    cartCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// Custom hook to use cart context
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
