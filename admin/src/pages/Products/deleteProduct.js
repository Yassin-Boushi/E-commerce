import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteData, fetchDataFromApi } from "../../utils/api";
import { MyContext } from "../../App";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { emphasize, styled } from "@mui/material/styles";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { FaTrash } from "react-icons/fa";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

// Breadcrumb code (same as before)
const StyledBreadcrumb = styled(Chip)(({ theme }) => {
  const backgroundColor =
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[800];
  return {
    backgroundColor,
    height: theme.spacing(3),
    color: theme.palette.text.primary,
    fontWeight: theme.typography.fontWeightRegular,
    "&:hover, &:focus": {
      backgroundColor: emphasize(backgroundColor, 0.06),
    },
    "&:active": {
      boxShadow: theme.shadows[1],
      backgroundColor: emphasize(backgroundColor, 0.12),
    },
  };
});

const ProductDelete = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const context = useContext(MyContext);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchProductDetails();
  }, []);

  const fetchProductDetails = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDataFromApi(`/api/products/${id}`);
      setProduct(data);
    } catch (error) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Failed to fetch product details",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    setIsDeleting(true);
    try {
      await deleteData(`/api/products/delete/${id}`);

      context.setAlertBox({
        open: true,
        error: false,
        msg: "Product deleted successfully!",
      });

      navigate("/products");
    } catch (error) {
      context.setAlertBox({
        open: true,
        error: true,
        msg: "Failed to delete product",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    navigate("/products");
  };

  return (
    <>
      <div className="right-content w-100">
        <div className="card shadow border-0 w-100 flex-row p-4">
          <h5 className="mb-0">Delete Product</h5>
          <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
            <StyledBreadcrumb
              component="a"
              href="#"
              label="Dashboard"
              icon={<HomeIcon fontSize="small" />}
            />
            <StyledBreadcrumb
              component="a"
              label="Products"
              href="#"
              deleteIcon={<ExpandMoreIcon />}
            />
            <StyledBreadcrumb
              label="Delete Product"
              deleteIcon={<ExpandMoreIcon />}
            />
          </Breadcrumbs>
        </div>

        <div className="card p-4 mt-4">
          {isLoading ? (
            <div className="text-center py-4">
              <CircularProgress />
            </div>
          ) : product ? (
            <>
              <h5 className="mb-4">Confirm Product Deletion</h5>

              <div className="alert alert-danger">
                <strong>Warning!</strong> Are you sure you want to delete this
                product? This action cannot be undone.
              </div>

              <div className="product-details">
                <div className="row">
                  <div className="col-md-4">
                    <div className="product-image">
                      {product.images && product.images.length > 0 && (
                        <LazyLoadImage
                          alt={product.name}
                          effect="blur"
                          src={product.images[0]}
                          className="img-fluid rounded"
                        />
                      )}
                    </div>
                  </div>
                  <div className="col-md-8">
                    <h3>{product.name}</h3>
                    <p className="text-muted">{product.description}</p>

                    <div className="details mt-4">
                      <div className="row">
                        <div className="col-md-6">
                          <p>
                            <strong>Category:</strong> {product.catName}
                          </p>
                          <p>
                            <strong>Sub Category:</strong> {product.subCatName}
                          </p>
                          <p>
                            <strong>Brand:</strong> {product.brand}
                          </p>
                        </div>
                        <div className="col-md-6">
                          <p>
                            <strong>Price:</strong> ${product.price}
                          </p>
                          <p>
                            <strong>Stock:</strong> {product.countInStock}
                          </p>
                          <p>
                            <strong>Rating:</strong> {product.rating}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 d-flex justify-content-end">
                <Button
                  variant="contained"
                  color="secondary"
                  className="mr-3"
                  onClick={handleCancel}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<FaTrash />}
                  onClick={handleDeleteProduct}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Delete Product"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p>Product not found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductDelete;
