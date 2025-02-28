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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      
      const productIsInCart = cart.find(product => product.id === productId);

      if (productIsInCart) {

        const stockResponse = await api.get<Stock>(`/stock/${productId}`);
        const productStock = stockResponse.data;

        if (productIsInCart.amount >= productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newCart = cart.map((product) =>{
          if (product.id === productId) {
            product.amount += 1;
          }
          return product;
        })
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        setCart(newCart);
      } 

     else {

        const response = await api.get(`/products/${productId}`);

        const newProductCart = {...response.data, amount: 1};

        const newCart = [...cart, newProductCart];

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        setCart(newCart);

      }
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {

      const productExists = cart.find(product => product.id === productId);

      if (!productExists) {
        throw new Error();
      }
      
      const newCart = cart.filter(product => product.id !== productId);

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
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
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const productStock = stockResponse.data;

      if (amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(cartProduct => {
        if (productId === cartProduct.id) {
          cartProduct.amount = amount;
        }
        return cartProduct;
      });

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
