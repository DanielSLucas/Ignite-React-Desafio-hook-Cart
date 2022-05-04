import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const setNewCartState = (updatedCart: Product[]) => {
    setCart(updatedCart);      
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
  }

  const addProduct = async (productId: number) => {
    try {
      const {data: { amount: inStockQuantity } } = await api.get<Stock>(`/stock/${productId}`);      
      
      if (inStockQuantity === 0) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      
      let updatedCart: Product[] = [];
      const productInCart = cart.find(product => product.id === productId);            

      if (productInCart) {
        const quantityAvailable = (productInCart.amount + 1) <= inStockQuantity;

        if (!quantityAvailable) {
          toast.error("Quantidade solicitada fora de estoque");
          return;   
        }

        updatedCart = cart.map(product => {
          if (product.id === productId) {
            return  {
              ...product,
              amount: product.amount + 1,
            };
          }

          return product;
        });              
      } else {
        const respose = await api.get<Product>(`/products/${productId}`);
        updatedCart = [...cart, {...respose.data, amount: 1}];
      }

      setNewCartState(updatedCart);      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);

      if (!productInCart) {
        throw new Error();
      }

      const updatedCart = cart.filter(product => product.id !== productId);
      
      setNewCartState(updatedCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      
      const {data: { amount: inStockQuantity } } = await api.get<Stock>(`/stock/${productId}`);

      if (inStockQuantity < amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = cart.map(product => {
        if (product.id === productId) {
          return  {
            ...product,
            amount,
          };
        }

        return product;
      });     
      
      setNewCartState(updatedCart);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
